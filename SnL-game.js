// Snakes & Ladders - Complete Game
const SNAKES = {15:4, 19:7, 27:2, 36:19, 41:21, 52:25, 58:40, 62:19, 89:57, 95:75, 97:79};
const LADDERS = {3:21, 8:27, 20:41, 28:71, 43:61, 54:76, 70:90, 80:99};
let playerPos = [0,0,0,0]; // 4 players
let currentPlayer = 0;
let gameWon = false;

function initBoard() {
    const board = document.getElementById('board');
    board.innerHTML = '';
    for(let i=99; i>=1; i--) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.textContent = i;
        if(SNAKES[i]) cell.classList.add('snake');
        if(LADDERS[i]) cell.classList.add('ladder');
        board.appendChild(cell);
    }
}

function updateBoard() {
    document.querySelectorAll('.cell').forEach((cell, idx) => {
        cell.classList.remove('current');
        const pos = 99 - idx;
        playerPos.forEach((p, player) => {
            if(p === pos) {
                cell.classList.add('current');
                cell.textContent = `P${player+1}`;
            }
        });
    });
}

function rollDice() {
    if(gameWon) return;
    const roll = Math.floor(Math.random() * 6) + 1;
    document.getElementById('dice').textContent = roll;
    
    let newPos = playerPos[currentPlayer] + roll;
    if(newPos > 100) {
        document.getElementById('status').textContent = `Player ${currentPlayer+1} needs exact 100!`;
        nextPlayer();
        return;
    }
    
    // Snake/Ladder
    while(SNAKES[newPos] || LADDERS[newPos]) {
        if(SNAKES[newPos]) {
            document.getElementById('status').textContent = `🐍 Snake! ${newPos} → ${SNAKES[newPos]}`;
            newPos = SNAKES[newPos];
        } else {
            document.getElementById('status').textContent = `🪜 Ladder! ${newPos} → ${LADDERS[newPos]}`;
            newPos = LADDERS[newPos];
        }
    }
    
    playerPos[currentPlayer] = newPos;
    updateBoard();
    
    if(newPos >= 100) {
        document.getElementById('winnerMsg').innerHTML = `🎉 Player ${currentPlayer+1} WINS!`;
        document.getElementById('winnerMsg').className = 'winner';
        document.getElementById('winnerMsg').style.display = 'block';
        gameWon = true;
        return;
    }
    
    document.getElementById('status').textContent = `Player ${currentPlayer+1} moved to ${newPos}`;
    nextPlayer();
}

function nextPlayer() {
    currentPlayer = (currentPlayer + 1) % 4;
    setTimeout(() => {
        document.getElementById('status').textContent = `Player ${currentPlayer+1}'s Turn - Click Roll Dice! 🎲`;
    }, 2000);
}

function resetGame() {
    playerPos = [0,0,0,0];
    currentPlayer = 0;
    gameWon = false;
    document.getElementById('dice').textContent = '?';
    document.getElementById('status').textContent = "Player 1's Turn - Click Roll Dice! 🎲";
    document.getElementById('winnerMsg').style.display = 'none';
    updateBoard();
}

// 🏁 Initialize
initBoard();
updateBoard();
