let criteria = [
  { name: "Correctly defines photosynthesis", points: 3 },
  { name: "Names both required inputs (CO2 + water)", points: 2 },
  { name: "Names both required outputs (glucose + oxygen)", points: 2 },
  { name: "Explains role of sunlight/chlorophyll", points: 3 },
];
let uploadedImage = null; // {base64, mimeType}

function renderCriteria(){
  const list = document.getElementById('criteria-list');
  list.innerHTML = criteria.map((c, i) => `
    <div class="criterion-row">
      <input type="text" value="${c.name.replace(/"/g,'&quot;')}" data-idx="${i}" class="crit-name-input">
      <input type="number" min="1" value="${c.points}" data-idx="${i}" class="crit-points-input">
      <button class="rm-btn" data-idx="${i}">×</button>
    </div>
  `).join('');

  list.querySelectorAll('.crit-name-input').forEach(inp => {
    inp.addEventListener('input', (e) => { criteria[e.target.dataset.idx].name = e.target.value; });
  });
  list.querySelectorAll('.crit-points-input').forEach(inp => {
    inp.addEventListener('input', (e) => { criteria[e.target.dataset.idx].points = parseInt(e.target.value) || 1; });
  });
  list.querySelectorAll('.rm-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      criteria.splice(parseInt(e.target.dataset.idx), 1);
      renderCriteria();
    });
  });
}

document.getElementById('add-criterion-btn').addEventListener('click', () => {
  criteria.push({ name: "", points: 1 });
  renderCriteria();
});

renderCriteria();

/* ---------------- Image upload + client-side compression ---------------- */
const dropzoneWrap = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');

dropzoneWrap.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

['dragover','dragleave','drop'].forEach(evt => {
  document.getElementById('upload-area').addEventListener(evt, (e) => {
    e.preventDefault();
    const dz = document.getElementById('dropzone');
    if(!dz) return;
    if(evt === 'dragover') dz.classList.add('drag');
    else dz.classList.remove('drag');
    if(evt === 'drop' && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
});

function handleFile(file){
  if(!file) return;
  compressImage(file, 1600, 0.82).then(({ base64, mimeType }) => {
    uploadedImage = { base64, mimeType };
    const dataUrl = `data:${mimeType};base64,${base64}`;
    document.getElementById('upload-area').innerHTML = `
      <div class="preview-wrap">
        <img src="${dataUrl}" />
        <button class="preview-clear" id="clear-image-btn">×</button>
      </div>
    `;
    document.getElementById('clear-image-btn').addEventListener('click', clearImage);
    document.getElementById('grade-btn').disabled = false;
  }).catch(err => {
    console.error(err);
    showError("Couldn't process that image. Try a different photo.");
  });
}

// Resizes/compresses the image client-side so large phone photos stay
// comfortably under serverless request size limits.
function compressImage(file, maxDimension, quality){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if(width > maxDimension || height > maxDimension){
          if(width > height){
            height = Math.round(height * (maxDimension / width));
            width = maxDimension;
          } else {
            width = Math.round(width * (maxDimension / height));
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve({ base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' });
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function clearImage(){
  uploadedImage = null;
  document.getElementById('grade-btn').disabled = true;
  document.getElementById('upload-area').innerHTML = `
    <div class="dropzone" id="dropzone">
      <svg viewBox="0 0 24 24"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"/></svg>
      <div class="dz-title">Tap to upload or take a photo</div>
      <div class="dz-sub">JPG or PNG of the assignment</div>
    </div>
    <input type="file" id="file-input" accept="image/*" capture="environment" style="display:none">
  `;
  document.getElementById('dropzone').addEventListener('click', () => document.getElementById('file-input').click());
  document.getElementById('file-input').addEventListener('change', (e) => handleFile(e.target.files[0]));
}

/* ---------------- Grading flow ---------------- */
function showLoading(step){
  document.getElementById('results-panel').innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <div class="loading-step">${step}</div>
    </div>
  `;
}
function showError(msg){
  document.getElementById('results-panel').innerHTML = `
    <div class="error-box">
      <strong>Something went wrong.</strong><br>${msg}
      <div><button class="retry-btn" id="retry-btn">Try again</button></div>
    </div>
  `;
  document.getElementById('retry-btn').addEventListener('click', runGrading);
}

document.getElementById('grade-btn').addEventListener('click', runGrading);

async function runGrading(){
  if(!uploadedImage) return;
  const validCriteria = criteria.filter(c => c.name.trim().length > 0);
  if(validCriteria.length === 0){
    showError("Add at least one rubric criterion first.");
    return;
  }

  document.getElementById('grade-btn').disabled = true;
  showLoading("Reading the handwriting...");

  const rubricText = validCriteria.map((c,i) => `${i+1}. ${c.name} (${c.points} point${c.points>1?'s':''})`).join('\n');
  const totalPossible = validCriteria.reduce((a,c) => a + c.points, 0);

  const prompt = `You are grading a student's handwritten assignment for a teacher. Here is the marking guide:

${rubricText}

Total possible points: ${totalPossible}

Look at the attached photo of the student's handwritten answer. First transcribe the handwriting as accurately as you can. Then grade it against each criterion above, awarding partial or full points as appropriate. If the handwriting is unclear for a given part, or the judgment is subjective/borderline, set "needs_review" to true for that criterion.

Respond with ONLY valid JSON, no markdown fences, no commentary, in exactly this structure:
{
  "transcription": "the transcribed text",
  "criteria": [
    { "name": "criterion name", "points_possible": number, "points_awarded": number, "reasoning": "one short sentence", "needs_review": boolean }
  ],
  "overall_confidence": "high" | "medium" | "low"
}`;

  const loadingTimer = setTimeout(() => showLoading("Comparing against your rubric..."), 1400);

  try {
    const response = await fetch("/api/grade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mimeType: uploadedImage.mimeType,
        imageBase64: uploadedImage.base64,
        prompt
      })
    });

    const data = await response.json();

    if(!response.ok || data.error){
      throw new Error(typeof data.error === 'string' ? data.error : "The grading service returned an error.");
    }

    let cleaned = data.result.trim().replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch(e){
      throw new Error("Couldn't read the AI's response format. Try again.");
    }

    renderResults(parsed, totalPossible);
  } catch(err){
    console.error(err);
    showError(err.message || "Please check your connection and try again.");
  } finally {
    clearTimeout(loadingTimer);
    document.getElementById('grade-btn').disabled = false;
  }
}

function renderResults(result, totalPossible){
  const criteriaResult = result.criteria || [];
  const confidence = result.overall_confidence || 'medium';

  const criteriaHtml = criteriaResult.map((c, i) => `
    <div class="criterion-card ${c.needs_review ? 'needs-review' : ''}">
      <div class="crit-head">
        <div class="crit-name">${escapeHtml(c.name)}</div>
        ${c.needs_review ? '<div class="review-flag">NEEDS REVIEW</div>' : ''}
      </div>
      <div class="crit-reasoning">${escapeHtml(c.reasoning || '')}</div>
      <div class="crit-score-row">
        <span class="ai-badge">AI suggested:</span>
        <input type="number" min="0" max="${c.points_possible}" value="${c.points_awarded}" id="score-${i}" class="score-input">
        <span class="of">/ ${c.points_possible}</span>
      </div>
    </div>
  `).join('');

  document.getElementById('results-panel').innerHTML = `
    <div class="score-hero">
      <div>
        <div class="label">SUGGESTED TOTAL</div>
        <div class="big" id="total-display">${sumScores(criteriaResult)}<span> / ${totalPossible}</span></div>
      </div>
      <div class="confidence-chip ${confidence}">${confidence.toUpperCase()} CONFIDENCE</div>
    </div>

    <div class="transcription-box">
      <div class="transcription-label">TRANSCRIBED FROM HANDWRITING</div>
      ${escapeHtml(result.transcription || '')}
    </div>

    ${criteriaHtml}

    <div class="confirm-bar" id="confirm-bar">
      <div class="txt">Review each score above, adjust anything you disagree with, then confirm.</div>
      <button class="confirm-btn" id="confirm-btn">Confirm Grades</button>
    </div>
  `;

  document.querySelectorAll('.score-input').forEach(inp => {
    inp.addEventListener('input', recomputeTotal);
  });
  document.getElementById('confirm-btn').addEventListener('click', confirmGrades);
}

function sumScores(criteriaResult){
  return criteriaResult.reduce((a,c) => a + (c.points_awarded || 0), 0);
}

function recomputeTotal(){
  const inputs = document.querySelectorAll('.score-input');
  let total = 0;
  inputs.forEach(inp => total += parseInt(inp.value) || 0);
  const totalEl = document.getElementById('total-display');
  const suffix = totalEl.querySelector('span').outerHTML;
  totalEl.innerHTML = total + suffix;
}

function confirmGrades(){
  document.querySelectorAll('.score-input').forEach(inp => {
    inp.disabled = true;
    inp.style.borderColor = '#2F9E6E';
    inp.style.color = '#2F9E6E';
  });
  document.getElementById('confirm-bar').innerHTML = '<div class="txt" style="font-weight:800; color:#2F9E6E;">✓ Grades confirmed by teacher.</div>';
}

function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
