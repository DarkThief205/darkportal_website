const boardEl = document.getElementById('tttBoard');
const msgEl = document.getElementById('tttMsg');
const resetBtn = document.getElementById('tttReset');
const tokenTtt = localStorage.getItem('dg_token');
let board, ended;
const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
function check(b){ for(const [a,c,d] of wins) if(b[a] && b[a]===b[c] && b[a]===b[d]) return b[a]; return b.every(Boolean) ? 'draw' : null; }
function botMove(){ const empty = board.map((v,i)=>v?null:i).filter(v=>v!==null); const winOrBlock = (mark) => { for(const i of empty){ const copy=[...board]; copy[i]=mark; if(check(copy)===mark) return i; } return null; }; const move = winOrBlock('O') ?? winOrBlock('X') ?? (board[4]?null:4) ?? empty[Math.floor(Math.random()*empty.length)]; if(move!==undefined && move!==null) board[move]='O'; }
function render(){ boardEl.innerHTML=''; board.forEach((v,i)=>{ const b=document.createElement('button'); b.className='ttt-cell'; b.textContent=v || ''; b.disabled=ended || !!v; b.onclick=()=>play(i); boardEl.appendChild(b); }); }
async function save(result){ if(!tokenTtt) return; await fetch('/api/games/progress/tictactoe',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${tokenTtt}`},body:JSON.stringify({result,score: result==='win'?100:result==='draw'?40:10,meta:{source:'web'}})}).catch(()=>{}); }
async function finish(result){ ended=true; msgEl.textContent = result==='win' ? 'You win! +XP' : result==='loss' ? 'Bot wins. +participation XP' : 'Draw. +XP'; await save(result); render(); }
function play(i){ if(ended || board[i]) return; board[i]='X'; let r=check(board); if(r){ finish(r==='X'?'win':'draw'); return; } botMove(); r=check(board); if(r){ finish(r==='O'?'loss':'draw'); return; } msgEl.textContent='Your turn.'; render(); }
function reset(){ board=Array(9).fill(''); ended=false; msgEl.textContent=tokenTtt?'Logged in: progress will be saved.':'Login to save progress.'; render(); }
resetBtn.onclick=reset; reset();
