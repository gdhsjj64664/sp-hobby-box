document.addEventListener('DOMContentLoaded', () => {
    // --- 全局 DOM 元素 ---
    const showBottlesBtn = document.getElementById('show-bottles-btn');
    const showGameBtn = document.getElementById('show-game-btn');
    const bottlesSection = document.getElementById('bottles-section');
    const gameSection = document.getElementById('game-section');
    const colorPalette = document.getElementById('color-palette');

    // --- 全局状态变量 ---
    let isEditMode = false;
    let currentDraggedCellId = null;
    let currentEditingCellId = null;

    // ========================================================================
    // --- 模块一：SP 爱好小瓶子 ---
    // ========================================================================
    const bottleGrid = document.getElementById('bottle-grid');
    const clearAllColorsBtn = document.getElementById('clear-all-colors-btn');
    const BOTTLES_STORAGE_KEY = 'spBottlePreferences';
    let bottles = [];
    let currentBottleId = null;

    const predefinedBottleNames = ["藤条", "发刷", "戒尺", "数据线", "巴掌", "鞭子", "散鞭", "猫拍", "带孔板子", "皮带", "小红", "小绿", "热熔胶", "皮拍", "木板", "竹板", "OTK", "跪趴", "尿布式", "罚站", "罚跪", "耳光", "打手心", "打脚心", "肛塞", "精神控制", "捆绑", "重打"];

    const getDefaultBottleColor = () => getComputedStyle(document.documentElement).getPropertyValue('--bottle-default-color').trim() || '#e0e0e0';

    const loadBottles = () => {
        const storedData = localStorage.getItem(BOTTLES_STORAGE_KEY);
        if (storedData) {
            bottles = JSON.parse(storedData);
            predefinedBottleNames.forEach(name => {
                if (!bottles.some(b => b.name === name)) {
                    bottles.push({ id: Date.now() + Math.random(), name: name, color: getDefaultBottleColor() });
                }
            });
            bottles = bottles.filter(b => predefinedBottleNames.includes(b.name));
        } else {
            bottles = predefinedBottleNames.map(name => ({ id: Date.now() + Math.random(), name: name, color: getDefaultBottleColor() }));
        }
    };
    
    const saveBottles = () => localStorage.setItem(BOTTLES_STORAGE_KEY, JSON.stringify(bottles));

    const renderBottles = () => {
        bottleGrid.innerHTML = '';
        bottles.forEach(bottle => {
            const container = document.createElement('div');
            container.className = 'bottle-container';
            container.dataset.id = bottle.id;
            container.innerHTML = `
                <svg class="bottle-svg" viewBox="0 0 100 100">
                    <path d="M75,35 C75,25 70,20 60,20 L40,20 C30,20 25,25 25,35 L25,60 C25,60 20,65 20,75 C20,85 30,90 50,90 C70,90 80,85 80,75 C80,65 75,60 75,60 L75,35 Z M40,25 L60,25 M30,40 L70,40" fill="${bottle.color}" />
                </svg>
                <div class="bottle-name">${escapeHTML(bottle.name)}</div>
            `;
            bottleGrid.appendChild(container);
        });
    };

    const escapeHTML = str => {
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    };

    bottleGrid.addEventListener('click', (e) => {
        const container = e.target.closest('.bottle-container');
        if (!container) return;
        currentBottleId = Number(container.dataset.id);
        colorPalette.style.display = 'flex';
        const rect = container.getBoundingClientRect();
        const leftPos = window.scrollX + rect.left + rect.width / 2 - colorPalette.offsetWidth / 2;
        colorPalette.style.top = `${window.scrollY + rect.bottom + 10}px`;
        colorPalette.style.left = `${Math.max(10, Math.min(leftPos, window.innerWidth - colorPalette.offsetWidth - 10))}px`;
    });

    clearAllColorsBtn.addEventListener('click', () => {
        if (confirm('确定要清空所有瓶子的标记颜色吗？')) {
            bottles.forEach(bottle => { bottle.color = getDefaultBottleColor(); });
            saveBottles();
            renderBottles();
        }
    });

    // ========================================================================
    // --- 模块二：SP 大冒险 (含编辑器) ---
    // ========================================================================
    const gameBoard = document.getElementById('game-board');
    const playerPiece = document.getElementById('player-piece');
    const rollDiceBtn = document.getElementById('roll-dice-btn');
    const resetGameBtn = document.getElementById('reset-game-btn');
    const diceResultDisplay = document.getElementById('dice-result');
    const editModeToggle = document.getElementById('edit-mode-toggle');
    const playControls = document.querySelector('.play-controls');
    const editControls = document.querySelector('.edit-controls');
    
    const editModal = document.getElementById('edit-modal');
    const cellTextInput = document.getElementById('cell-text-input');
    const cellTypeSelect = document.getElementById('cell-type-select');
    const saveCellBtn = document.getElementById('save-cell-btn');
    const cancelCellBtn = document.getElementById('cancel-cell-btn');
    const deleteCellBtn = document.getElementById('delete-cell-btn');

    const addCellBtn = document.getElementById('add-cell-btn');
    const saveLayoutBtn = document.getElementById('save-layout-btn');
    const loadLayoutBtn = document.getElementById('load-layout-btn');
    const resetLayoutBtn = document.getElementById('reset-layout-btn');

    const GAME_STORAGE_KEY = 'spAdventureGamePosition';
    const CUSTOM_LAYOUT_KEY = 'spAdventureCustomLayout';
    
    let boardLayout = [];
    let playerPosition = 0;
    let isMoving = false;
    
    const generateDefaultLayout = () => {
        const texts = ["起点", "皮带平趴50", "戒尺双手扶墙50", "otk巴掌100", "跪拍上跪撅100", "前进四步", "后退两步", "发刷60", "原地休息", "竹板50", "藤条双手扶墙60", "前进五步", "自选50", "回到原点", "diy戒尺60", "板子双手扶墙30", "前进两步", "后退四步", "皮拍80", "原地休息", "后退两步", "藤条100", "巴掌100中文报数", "床上跪撅5种工具5*25", "前进六步", "双手扶墙5种工具5*25", "跪椅子上5种工具5*25", "终点", "发刷100", "竹板100", "diy发刷80", "自选70", "回到原点", "藤条平躺抱腿50", "自选60", "巴掌100英文报数"];
        const types = ["start", "task", "task", "task", "task", "action", "action", "task", "action", "task", "task", "action", "task", "special", "task", "task", "action", "action", "task", "action", "action", "task", "task", "task", "action", "task", "task", "end", "task", "task", "task", "task", "special", "task", "task", "task"];
        const gridPositions = ["5/1", "5/2", "5/3", "5/4", "5/5", "5/6", "5/7", "5/8", "5/9", "5/10", "4/10", "3/10", "2/10", "1/10", "1/9", "1/8", "1/7", "1/6", "1/5", "1/4", "1/3", "1/2", "2/2", "2/3", "2/4", "2/5", "2/6", "2/7", "3/7", "3/6", "3/5", "3/4", "3/3", "4/3", "4/2", "4/1"];
        return texts.map((text, i) => ({ id: Date.now() + i, text, type: types[i] || 'task', gridArea: gridPositions[i] }));
    };

    const renderBoard = () => {
        gameBoard.innerHTML = '';
        const occupiedGridAreas = new Set(boardLayout.map(cell => cell.gridArea));

        for (let r = 1; r <= 5; r++) {
            for (let c = 1; c <= 10; c++) {
                const gridArea = `${r}/${c}`;
                if (occupiedGridAreas.has(gridArea)) continue;
                const placeholder = document.createElement('div');
                placeholder.className = 'grid-placeholder';
                placeholder.style.gridArea = gridArea;
                placeholder.dataset.gridArea = gridArea;
                gameBoard.appendChild(placeholder);
            }
        }
        
        boardLayout.forEach(cellData => {
            const cellDiv = document.createElement('div');
            cellDiv.className = `game-cell cell-type-${cellData.type}`;
            cellDiv.style.gridArea = cellData.gridArea;
            cellDiv.textContent = cellData.text;
            cellDiv.dataset.id = cellData.id;
            gameBoard.appendChild(cellDiv);
        });
        
        const centerTitle = document.createElement('div');
        centerTitle.className = 'game-cell cell-type-center';
        centerTitle.style.gridArea = '3/4/span 1/span 3';
        centerTitle.textContent = 'SP大冒险';
        gameBoard.appendChild(centerTitle);

        updateCellInteractivity();
        movePiece(playerPosition, false);
    };

    const updateCellInteractivity = () => {
        document.querySelectorAll('.game-cell').forEach(cell => {
            if (isEditMode && cell.dataset.id) {
                cell.classList.add('editable');
                cell.draggable = true;
                cell.ondblclick = () => openEditModal(cell.dataset.id);
                cell.ondragstart = handleDragStart;
                cell.ondragend = handleDragEnd;
            } else {
                cell.classList.remove('editable');
                cell.draggable = false;
                cell.ondblclick = null;
                cell.ondragstart = null;
                cell.ondragend = null;
            }
        });
    };

    const toggleEditMode = () => {
        isEditMode = !isEditMode;
        gameSection.classList.toggle('edit-mode', isEditMode);
        playControls.style.display = isEditMode ? 'none' : 'flex';
        editControls.style.display = isEditMode ? 'flex' : 'none';
        playerPiece.style.opacity = isEditMode ? '0' : '1';
        editModeToggle.textContent = isEditMode ? '退出编辑模式' : '进入编辑模式';
        editModeToggle.classList.toggle('danger-btn', isEditMode);
        editModeToggle.classList.toggle('edit-btn', !isEditMode);
        renderBoard();
    };

    const handleDragStart = (e) => {
        currentDraggedCellId = e.target.dataset.id;
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    };
    const handleDragEnd = (e) => e.target.classList.remove('dragging');
    
    gameBoard.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (isEditMode && e.target.classList.contains('grid-placeholder')) {
            e.target.classList.add('drag-over');
        }
    });
    gameBoard.addEventListener('dragleave', (e) => {
        if (e.target.classList.contains('grid-placeholder')) {
            e.target.classList.remove('drag-over');
        }
    });
    gameBoard.addEventListener('drop', (e) => {
        e.preventDefault();
        if (isEditMode && e.target.classList.contains('grid-placeholder')) {
            e.target.classList.remove('drag-over');
            const targetGridArea = e.target.dataset.gridArea;
            const draggedCell = boardLayout.find(c => c.id == currentDraggedCellId);
            if (draggedCell) {
                draggedCell.gridArea = targetGridArea;
                renderBoard();
            }
        }
    });

    const openEditModal = (cellId) => {
        currentEditingCellId = cellId;
        const cellData = boardLayout.find(c => c.id == cellId);
        if (cellData) {
            cellTextInput.value = cellData.text;
            cellTypeSelect.value = cellData.type;
            editModal.style.display = 'flex';
        }
    };
    const closeEditModal = () => editModal.style.display = 'none';
    
    saveCellBtn.addEventListener('click', () => {
        const cellData = boardLayout.find(c => c.id == currentEditingCellId);
        if (cellData) {
            cellData.text = cellTextInput.value;
            cellData.type = cellTypeSelect.value;
            renderBoard();
        }
        closeEditModal();
    });
    deleteCellBtn.addEventListener('click', () => {
        if (confirm('确定要删除这个方块吗？')) {
            boardLayout = boardLayout.filter(c => c.id != currentEditingCellId);
            renderBoard();
            closeEditModal();
        }
    });
    cancelCellBtn.addEventListener('click', closeEditModal);

    addCellBtn.addEventListener('click', () => {
        const allGridAreas = new Set();
        for (let r = 1; r <= 5; r++) for (let c = 1; c <= 10; c++) allGridAreas.add(`${r}/${c}`);
        const occupiedAreas = new Set(boardLayout.map(c => c.gridArea));
        const availableAreas = [...allGridAreas].filter(area => !occupiedAreas.has(area));
        if (availableAreas.length > 0) {
            const newCell = { id: Date.now(), text: "新方块", type: "task", gridArea: availableAreas[0] };
            boardLayout.push(newCell);
            renderBoard();
        } else {
            alert('棋盘已满，无法添加新方块！');
        }
    });
    saveLayoutBtn.addEventListener('click', () => {
        localStorage.setItem(CUSTOM_LAYOUT_KEY, JSON.stringify(boardLayout));
        alert('自定义布局已保存！');
    });
    loadLayoutBtn.addEventListener('click', () => {
        const customLayout = localStorage.getItem(CUSTOM_LAYOUT_KEY);
        if (customLayout) {
            boardLayout = JSON.parse(customLayout);
            renderBoard();
            alert('自定义布局已加载。');
        } else {
            alert('没有找到自定义布局。');
        }
    });
    resetLayoutBtn.addEventListener('click', () => {
        if (confirm('确定要恢复到默认布局吗？您当前未保存的更改将丢失。')) {
            boardLayout = generateDefaultLayout();
            renderBoard();
            alert('已恢复为默认布局。');
        }
    });
    
    const movePiece = (index, animated = true) => {
        if (isEditMode) return;
        isMoving = true;
        
        const targetCellData = boardLayout[index];
        if (!targetCellData) { isMoving = false; return; } // 位置超出范围
        const targetCell = gameBoard.querySelector(`[data-id='${targetCellData.id}']`);
        if (!targetCell) { isMoving = false; return; } // 棋盘上找不到对应元素
        
        const boardRect = gameBoard.getBoundingClientRect();
        const cellRect = targetCell.getBoundingClientRect();
        
        playerPiece.style.transition = animated ? 'top 0.5s ease-in-out, left 0.5s ease-in-out' : 'none';
        playerPiece.style.left = `${cellRect.left - boardRect.left + cellRect.width / 2}px`;
        playerPiece.style.top = `${cellRect.top - boardRect.top + cellRect.height / 2}px`;

        setTimeout(() => {
            isMoving = false;
            if (animated) handleSquareAction(index);
        }, animated ? 500 : 0);
    };

    const handleSquareAction = (index) => {
        const square = boardLayout[index];
        if (!square) return;

        setTimeout(() => {
            alert(`你到达了: ${square.text}`);
            let newPos = index;
            // 注意：游戏顺序由数组索引决定，拖动位置不影响顺序
            switch (square.text) {
                case "前进四步": newPos += 4; break;
                case "前进两步": newPos += 2; break;
                case "前进五步": newPos += 5; break;
                case "前进六步": newPos += 6; break;
                case "后退两步": newPos -= 2; break;
                case "后退四步": newPos -= 4; break;
                case "回到原点": newPos = 0; break;
            }

            // 确保位置在有效范围内
            newPos = Math.max(0, Math.min(newPos, boardLayout.length - 1));

            if (newPos !== index) {
                playerPosition = newPos;
                localStorage.setItem(GAME_STORAGE_KEY, playerPosition);
                movePiece(playerPosition);
            }
        }, 100);
    };

    rollDiceBtn.addEventListener('click', () => {
        if (isMoving || isEditMode) return;
        const roll = Math.floor(Math.random() * 6) + 1;
        diceResultDisplay.textContent = roll;
        let newPosition = playerPosition + roll;

        const endIndex = boardLayout.findIndex(s => s.type === 'end');
        // 如果没有终点，则以数组末尾为终点
        const finalIndex = (endIndex !== -1) ? endIndex : boardLayout.length - 1;

        if (newPosition >= finalIndex) {
            newPosition = finalIndex;
            setTimeout(() => alert('恭喜你到达终点！🎉'), 600);
        }

        playerPosition = newPosition;
        localStorage.setItem(GAME_STORAGE_KEY, playerPosition);
        movePiece(playerPosition);
    });

    resetGameBtn.addEventListener('click', () => {
        if (confirm('确定要重新开始游戏吗？')) {
            playerPosition = 0;
            localStorage.setItem(GAME_STORAGE_KEY, playerPosition);
            movePiece(playerPosition, false);
            diceResultDisplay.textContent = '🎲';
        }
    });

    // ========================================================================
    // --- 通用与初始化 ---
    // ========================================================================
    const switchTab = (activeTab) => {
        if (activeTab === 'bottles') {
            bottlesSection.style.display = 'block';
            gameSection.style.display = 'none';
            showBottlesBtn.classList.add('active');
            showGameBtn.classList.remove('active');
        } else {
            bottlesSection.style.display = 'none';
            gameSection.style.display = 'block';
            showBottlesBtn.classList.remove('active');
            showGameBtn.classList.add('active');
            movePiece(playerPosition, false);
        }
    };

    showBottlesBtn.addEventListener('click', () => switchTab('bottles'));
    showGameBtn.addEventListener('click', () => switchTab('game'));

    colorPalette.addEventListener('click', (e) => {
        if (e.target.classList.contains('color-swatch')) {
            const newColor = e.target.dataset.color;
            const bottleToUpdate = bottles.find(b => b.id === currentBottleId);
            if (bottleToUpdate) {
                bottleToUpdate.color = newColor;
                saveBottles();
                renderBottles();
            }
            colorPalette.style.display = 'none';
        }
    });

    document.addEventListener('click', (e) => {
        if (!colorPalette.contains(e.target) && !e.target.closest('.bottle-container')) {
            colorPalette.style.display = 'none';
        }
    });

    const initialize = () => {
        loadBottles();
        renderBottles();

        const customLayout = localStorage.getItem(CUSTOM_LAYOUT_KEY);
        boardLayout = customLayout ? JSON.parse(customLayout) : generateDefaultLayout();
        playerPosition = Number(localStorage.getItem(GAME_STORAGE_KEY)) || 0;
        renderBoard();
        
        switchTab('bottles');
    };

    editModeToggle.addEventListener('click', toggleEditMode);
    initialize();
});