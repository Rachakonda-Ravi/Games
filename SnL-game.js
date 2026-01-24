// **Snakes & Ladders - Pure JS** (Your exact board [file:29][file:30])
(function(){
'use strict';

const SNAKES={99:82,98:17,95:75,93:73,91:71,87:24,84:63,64:60,62:19,56:53,52:11,49:26,47:16,34:6,32:10,17:7,14:4};
const LADDERS={80:100,71:91,51:67,43:62,28:84,21:42,4:34,61:87,82:88,3:21};
const EMOJIS=['♟️','♔','♕','♖','♗','♘','♚','♛','♜','♝','♞','🎲'];

let numPlayers=2,currentPlayer=0,gameOver=false,positions=[],playerPieces=[];

// Create full game
function createGame(){
    // Style
    const style=document.createElement('style');
    style.textContent=`
        #sl-game{position:fixed;top:10%;left:10%;width:80vw;height:70vh;max-width:600px;max-height:600px;background:linear-gradient(135deg,#667eea,#764ba2);border-radius:20px;box-shadow:0 25px 60px rgba(0,0,0,.5);font-family:'Segoe UI',sans-serif;color:#fff;display:flex;flex-direction:column;align-items:center;padding:20px;z-index:9999;overflow:hidden}
        #sl-header{font-size:2em;margin-bottom:10px;text-shadow:2px 2px 4px rgba(0,0,0,.4)}
        #sl-controls{display:flex;flex-wrap:wrap;gap:15px;justify-content:center;margin:15px 0}
        .sl-control{background:rgba(255,255,255,.25);padding:12px;border-radius:12px;min-width:120px}
        #sl-status{font-size:1.4em;margin:20px;font-weight:700}
        #sl-board{position:relative;width:100%;height:400px;border:4px solid #fff;border-radius:15px;overflow:hidden}
        #sl-grid{display:grid;grid-template-columns:repeat(10,1fr);grid-template-rows:repeat(10,1fr);width:100%;height:100%;gap:2px;padding:8px;background:rgba(0,0,0,.2)}
        .sl-cell{border:2px solid rgba(255,255,255,.6);font-weight:700;display:flex;align-items:center;justify-content:center;font-size:11px;background:rgba(255,255,255,.1);cursor:pointer;transition:all .2s;border-radius:4px;position:relative}
        .sl-cell:hover{background:rgba(255,255,255,.4);box-shadow:0 4px 12px rgba(0,0,0,.3)}
        .sl-tooltip{position:absolute;top:-30px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.95);color:#fff;padding:4px 8px;border-radius:4px;font-size:10px;white-space:nowrap;opacity:0;transition:opacity .2s;pointer-events:none}
        .sl-cell:hover .sl-tooltip{opacity:1}
        .snake-start{background:linear-gradient(45deg,#ff4757,#ff6b7a)!important;border-color:#ff3838!important}
        .ladder-start{background:linear-gradient(45deg,#2ed573,#7bed9f)!important;border-color:#26ad5f!important}
        .sl-piece{font-size:24px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:8px;border:2px solid #fff;box-shadow:0 3px 12px rgba(0,0,0,.4);animation:sl-bounce .6s ease-out;z-index:3}
        @keyframes sl-bounce{0%{transform:scale(.4) translateY(12px);opacity:0}70%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}
        #sl-roll{background:linear-gradient(135deg,#ff9ff3,#f368e0);border:none;padding:14px 30px;font-size:1.1em;border-radius:30px;cursor:pointer;color:#fff;font-weight:700;box-shadow:0 6px 18px rgba(0,0,0,.3);transition:all .3s}
        #sl-roll:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 10px 25px rgba(0,0,0,.4)}
        #sl-roll:disabled{background:#666;cursor:not-allowed}
        #sl-winner{font-size:1.8em;color:gold;margin-top:15px;animation:sl-pulse 1.5s infinite}
        @keyframes sl-pulse{50%{transform:scale(1.1)}}
        #sl-close{position:absolute;top:10px;right:20px;background:rgba(0,0,0,.5);border:none;color:#fff;border-radius:50%;width:35px;height:35px;font-size:18px;cursor:pointer}
    `;
    document.head.appendChild(style);
    
    // Game container
    const game=document.createElement('div');
    game.id='sl-game';
    game.innerHTML=`
        <button id="sl-close" onclick="document.getElementById('sl-game').remove()">✕</button>
        <h1 id="sl-header">Snakes & Ladders 🎮</h1>
        <div id="sl-controls">
            <div class="sl-control">
                <label>Players:</label>
                <select id="sl-numPlayers" onchange="slSetupPlayers()">
                    <option value="2">2️⃣</option><option value="3">3️⃣</option>
                    <option value="4">4️⃣</option><option value="5">5️⃣</option>
                    <option value="6">6️⃣</option>
                </select>
            </div>
            <div id="sl-playerSelectors"></div>
        </div>
        <div id="sl-status">Click Players → Roll!</div>
        <div id="sl-board">
            <div id="sl-grid"></div>
            <svg id="sl-svg" viewBox="0 0 100 100"></svg>
        </div>
        <button id="sl-roll" onclick="slRollDice()" disabled>🎲 Roll</button>
        <div id="sl-winner" style="display:none"></div>
    `;
    document.body.appendChild(game);
    
    slInitBoard();
    slSetupPlayers();
}

// Core game logic (minified from previous)
const slInitBoard=()=>{
    const grid=document.getElementById('sl-grid'),svg=document.getElementById('sl-svg');
    grid.innerHTML='';svg.innerHTML='';
    for(let i=100;i>=1;i--){
        const cell=document.createElement('div');
        cell.className='sl-cell';cell.textContent=i;
        if(SNAKES[i]){cell.classList.add('snake-start');cell.innerHTML+=`<div class="sl-tooltip">🐍 to ${SNAKES[i]}</div>`}
        if(LADDERS[i]){cell.classList.add('ladder-start');cell.innerHTML+=`<div class="sl-tooltip">🪜 to ${LADDERS[i]}</div>`}
        grid.appendChild(cell);
    }
    // Draw connections (simplified)
    Object.entries({...SNAKES,...LADDERS}).forEach(([f,t],i)=>{
        const path=document.createElementNS('http://www.w3.org/2000/svg','path');
        const color=SNAKES[f]?'#ff4757':'#2ed573';
        path.setAttribute('d',`M${f%10}.5 ${Math.floor((100-f)/10)}.5 L${t%10}.5 ${Math.floor((100-t)/10)}.5`);
        path.setAttribute('stroke',color);path.setAttribute('stroke-width','1.8');
        path.setAttribute('stroke-linecap','round');path.style.filter='drop-shadow(0 2px 4px rgba(0,0,0,.6))';
        svg.appendChild(path);
    });
};

const slSetupPlayers=()=>{
    numPlayers=parseInt(document.getElementById('sl-numPlayers').value);
    positions=Array(numPlayers).fill(0);
    const cont=document.getElementById('sl-playerSelectors');
    cont.innerHTML='';
    for(let i=0;i<numPlayers;i++){
        const div=document.createElement('div');
        div.className='sl-control';
        div.innerHTML=`<label>P${i+1}</label><select onchange="slUpdatePieces(${i})">${EMOJIS.map((e,j)=>`<option value="${j}">${e}</option>`).join('')}</select>`;
        cont.appendChild(div);
    }
    document.getElementById('sl-roll').disabled=false;
};

const slUpdatePieces=(i)=>{
    const sel=document.querySelectorAll('#sl-playerSelectors select')[i];
    playerPieces[i]=parseInt(sel.value);
    slUpdateBoard();
};

const slRollDice=()=>{
    if(gameOver)return;
    const roll=Math.floor(Math.random()*6)+1;
    const status=document.getElementById('sl-status'),btn=document.getElementById('sl-roll');
    btn.disabled=true;status.innerHTML=`P${currentPlayer+1} rolled ${roll}!`;
    setTimeout(()=>{
        const newPos=Math.min(BOARDSIZE,positions[currentPlayer]+roll);
        const finalPos=Object.values({...SNAKES,...LADDERS})[newPos]||newPos;
        positions[currentPlayer]=finalPos;slUpdateBoard();
        const next=(currentPlayer+1)%numPlayers;
        status.innerHTML=`P${currentPlayer+1} → ${finalPos}<br>P${next+1} turn`;
        if(finalPos>=BOARDSIZE){
            status.innerHTML=`🎉 P${currentPlayer+1} WINS! 🏆`;
            document.getElementById('sl-winner').style.display='block';
            gameOver=true;return;
        }
        currentPlayer=next;btn.disabled=false;
    },1000);
};

const slUpdateBoard=()=>{
    const cells=document.querySelectorAll('.sl-cell');
    cells.forEach(c=>Array.from(c.children).forEach(ch=>ch.classList?.contains('sl-piece')&&ch.remove()));
    positions.forEach((p,i)=>p>0&&i<numPlayers&&(()=>{
        const piece=document.createElement('div');
        piece.className='sl-piece';
        piece.textContent=EMOJIS[playerPieces[i]];
        cells[100-p].appendChild(piece);
    })());
};

// Initialize
createGame();
})();
