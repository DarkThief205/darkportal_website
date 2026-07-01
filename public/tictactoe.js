const boardEl = document.getElementById('tttBoard');
const msgEl = document.getElementById('tttMsg');
const resetBtn = document.getElementById('tttReset');
const tokenTtt = localStorage.getItem('dg_token');
let board, ended;
const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
function check(b){ for(const [a,c,d] of wins) if(b[a] && b[a]===b[c] && b[a]===b[d]) return b[a]; return b.every(Boolean) ? 'draw' : null; }
function botMove(){ const empty = board.map((v,i)=>v?null:i).filter(v=>v!==null); const winOrBlock = (mark) => { for(const i of empty){ const copy=[...board]; copy[i]=mark; if(check(copy)===mark) return i; } return null; }; const move = winOrBlock('O') ?? winOrBlock('X') ?? (board[4]?null:4) ?? empty[Math.floor(Math.random()*empty.length)]; if(move!==undefined && move!==null) board[move]='O'; }
function render(){ if(!boardEl) return; boardEl.innerHTML=''; board.forEach((v,i)=>{ const b=document.createElement('button'); b.className='ttt-cell'; b.textContent=v || ''; b.disabled=ended || !!v; b.onclick=()=>play(i); boardEl.appendChild(b); }); }
function save(result){
  const key='darkportal_ttt_stats_v1';
  let s={wins:0,losses:0,draws:0,xp:0,bestScore:0};
  try{ s={...s,...JSON.parse(localStorage.getItem(key)||'{}')}; }catch{}
  if(result==='win') s.wins+=1; else if(result==='draw') s.draws+=1; else s.losses+=1;
  const score=result==='win'?100:result==='draw'?40:10;
  s.xp+=score;
  s.bestScore=Math.max(Number(s.bestScore||0),score);
  s.updatedAt=new Date().toISOString();
  localStorage.setItem(key,JSON.stringify(s));
}
async function finish(result){ ended=true; if(msgEl) msgEl.textContent = result==='win' ? 'You win! +XP' : result==='loss' ? 'Bot wins. +participation XP' : 'Draw. +XP'; save(result); render(); }
function play(i){ if(ended || board[i]) return; board[i]='X'; let r=check(board); if(r){ finish(r==='X'?'win':'draw'); return; } botMove(); r=check(board); if(r){ finish(r==='O'?'loss':'draw'); return; } if(msgEl) msgEl.textContent='Your turn.'; render(); }
function reset(){ board=Array(9).fill(''); ended=false; if(msgEl) msgEl.textContent=tokenTtt?'Logged in: progress is saved locally.':'Login to save local progress.'; render(); }
if(resetBtn) resetBtn.onclick=reset;
reset();
