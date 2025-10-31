class WriteRightApp {
    constructor() {
        this.uploadedFiles = new Map(); // 存储字符和文件的映射
        this.currentTaskId = null;
        this.generatedFontPath = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupCharacterGrids();
        this.setupCharacterSets();
        this.createNewTask();
    }

    setupEventListeners() {
        // 字符分类切换
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchCategory(e.target.dataset.category);
            });
        });

        // 批量上传
        const batchUploadArea = document.getElementById('batchUploadArea');
        const batchFileInput = document.getElementById('batchFileInput');
        
        batchUploadArea.addEventListener('click', () => batchFileInput.click());
        batchUploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        batchUploadArea.addEventListener('drop', this.handleBatchDrop.bind(this));
        batchFileInput.addEventListener('change', (e) => this.handleBatchFiles(e.target.files));

        // 生成按钮
        document.getElementById('createBtn').addEventListener('click', () => this.createFont());
        
        // 下载和重新开始按钮
        document.getElementById('downloadBtn').addEventListener('click', () => this.downloadFont());
        document.getElementById('restartBtn').addEventListener('click', () => this.restartProcess());
    }

    setupCharacterGrids() {
        // 定义字符集
        const characterSets = {
            uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
            lowercase: 'abcdefghijklmnopqrstuvwxyz',
            numbers: '0123456789',
            symbols: '.,!?;:-+*/='
        };

        // 为每个字符集创建网格
        Object.entries(characterSets).forEach(([category, chars]) => {
            const grid = document.getElementById(`${category}Grid`);
            grid.innerHTML = '';
            
            for (let char of chars) {
                const charItem = this.createCharItem(char);
                grid.appendChild(charItem);
            }
        });

        // 更新总字符数统计（大写26 + 小写26 + 数字10 + 符号10 = 72）
        this.updateUploadStats();
    }

    createCharItem(char) {
        const charItem = document.createElement('div');
        charItem.className = 'char-item';
        charItem.innerHTML = `
            <div class="char-label">${char}</div>
            <div class="char-preview"></div>
            <div class="upload-indicator">点击上传</div>
            <input type="file" class="char-input" accept="image/*" data-char="${char}">
        `;

        // 添加点击事件
        charItem.addEventListener('click', () => {
            const fileInput = charItem.querySelector('.char-input');
            fileInput.click();
        });

        // 文件选择事件
        const fileInput = charItem.querySelector('.char-input');
        fileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.handleCharUpload(char, e.target.files[0], charItem);
            }
        });

        return charItem;
    }

    async handleCharUpload(char, file, charItem) {
        // 显示预览
        const preview = charItem.querySelector('.char-preview');
        const reader = new FileReader();
        
        reader.onload = (e) => {
            preview.style.backgroundImage = `url(${e.target.result})`;
            preview.classList.add('has-image');
            charItem.classList.add('uploaded');
            charItem.querySelector('.upload-indicator').textContent = '已上传';
        };
        reader.readAsDataURL(file);

        // 存储文件
        this.uploadedFiles.set(char, file);
        
        // 更新统计
        this.updateUploadStats();
        
        // 上传到服务器
        await this.uploadToServer(char, file);
        
        this.showTemporaryMessage(`字符 "${char}" 上传成功！`, 'success');
    }

    async uploadToServer(char, file) {
        if (!this.currentTaskId) {
            await this.createNewTask();
        }

        const formData = new FormData();
        formData.append('char', char);
        formData.append('file', file);
        formData.append('task_id', this.currentTaskId);

        try {
            const response = await fetch('/upload_char', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || '上传失败');
            }

            console.log(`✅ 字符 ${char} 上传成功`);
        } catch (error) {
            console.error(`❌ 字符 ${char} 上传失败:`, error);
            this.showTemporaryMessage(`字符 "${char}" 上传失败: ${error.message}`, 'error');
            
            // 回滚UI状态
            this.uploadedFiles.delete(char);
            this.updateUploadStats();
            
            // 重置UI
            const charItem = this.findCharItem(char);
            if (charItem) {
                charItem.classList.remove('uploaded');
                const preview = charItem.querySelector('.char-preview');
                preview.style.backgroundImage = '';
                preview.classList.remove('has-image');
                charItem.querySelector('.upload-indicator').textContent = '点击上传';
            }
        }
    }

    async createNewTask() {
        try {
            const response = await fetch('/create_task', {
                method: 'POST'
            });

            const result = await response.json();

            if (response.ok) {
                this.currentTaskId = result.task_id;
                console.log('🎉 创建新任务:', this.currentTaskId);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('❌ 创建任务失败:', error);
            this.showTemporaryMessage('创建任务失败，请刷新页面重试', 'error');
        }
    }

    switchCategory(category) {
        // 更新激活的按钮
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });

        // 显示对应的网格
        document.querySelectorAll('.char-grid').forEach(grid => {
            grid.classList.toggle('active', grid.id === `${category}Grid`);
        });
    }

    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.style.background = 'linear-gradient(135deg, #fff5e1, #ffecb3)';
    }

    handleBatchDrop(e) {
        e.preventDefault();
        e.currentTarget.style.background = 'linear-gradient(135deg, #fff9e6, #fff5e1)';
        this.handleBatchFiles(e.dataTransfer.files);
    }

    async handleBatchFiles(files) {
        const imageFiles = Array.from(files).filter(file => 
            file.type.startsWith('image/')
        );

        if (imageFiles.length === 0) {
            this.showTemporaryMessage('请选择有效的图片文件！', 'error');
            return;
        }

        let processedCount = 0;
        
        for (let file of imageFiles) {
            // 从文件名推断字符（去掉扩展名）
            const char = file.name.split('.')[0];
            
            if (char && char.length === 1) {
                // 找到对应的字符元素
                const charItem = this.findCharItem(char);
                if (charItem) {
                    await this.handleCharUpload(char, file, charItem);
                    processedCount++;
                }
            }
        }

        this.showTemporaryMessage(`批量处理完成！成功匹配 ${processedCount} 个字符`, 'success');
    }

    findCharItem(char) {
        // 在所有网格中查找对应的字符元素
        const allCharItems = document.querySelectorAll('.char-item');
        for (let item of allCharItems) {
            const charLabel = item.querySelector('.char-label').textContent;
            if (charLabel === char) {
                return item;
            }
        }
        return null;
    }

    updateUploadStats() {
        const totalChars = 72; // 大写26 + 小写26 + 数字10 + 符号10
        const uploadedChars = this.uploadedFiles.size;
        const progress = Math.round((uploadedChars / totalChars) * 100);

        // 更新统计显示
        const statsElement = document.querySelector('.upload-stats');
        if (statsElement) {
            statsElement.innerHTML = `
                <div class="stat-item">
                    <span class="stat-number">${uploadedChars}</span>
                    <span class="stat-label">已上传</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">${totalChars}</span>
                    <span class="stat-label">总字符</span>
                </div>
                <div class="stat-item">
                    <span class="stat-number">${progress}%</span>
                    <span class="stat-label">完成度</span>
                </div>
            `;
        }
    }

    setupCharacterSets() {
        const charSetButtons = document.querySelectorAll('.char-set-btn');
        const textarea = document.getElementById('characters');
        
        const characterSets = {
            basic: `ABCDEFGHIJKLMNOPQRSTUVWXYZ\nabcdefghijklmnopqrstuvwxyz\n0123456789`,
            extended: `ABCDEFGHIJKLMNOPQRSTUVWXYZ\nabcdefghijklmnopqrstuvwxyz\n0123456789\n.,!?;:- ()[]{}`,
            custom: ''
        };

        // 设置默认激活基础字符集
        charSetButtons[0].classList.add('active');
        textarea.value = characterSets.basic;
        textarea.hidden = true;

        charSetButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // 移除所有active类
                charSetButtons.forEach(b => b.classList.remove('active'));
                // 添加active类到当前按钮
                btn.classList.add('active');
                
                const charset = btn.dataset.charset;
                
                if (charset === 'custom') {
                    textarea.hidden = false;
                    textarea.value = characterSets.custom;
                    textarea.focus();
                } else {
                    textarea.hidden = true;
                    textarea.value = characterSets[charset];
                }
            });
        });
    }

    async createFont() {
        if (!this.currentTaskId) {
            this.showTemporaryMessage('请先上传手写图片！', 'error');
            return;
        }

        if (this.uploadedFiles.size < 5) {
            this.showTemporaryMessage('建议至少上传5个字符以获得更好的效果！', 'warning');
            // 继续执行，不阻止
        }

        const fontName = document.getElementById('fontName').value.trim() || '我的WriteRight字体';
        const characters = document.getElementById('characters').value;

        const createBtn = document.getElementById('createBtn');
        const progressSection = document.getElementById('progress');
        const progressFill = document.getElementById('progressFill');

        // 显示进度界面
        createBtn.disabled = true;
        progressSection.hidden = false;

        // 模拟进度动画
        let progressValue = 0;
        const progressInterval = setInterval(() => {
            progressValue += Math.random() * 15;
            if (progressValue > 85) progressValue = 85;
            progressFill.style.width = progressValue + '%';
        }, 500);

        try {
            const response = await fetch('/create_font', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    task_id: this.currentTaskId,
                    font_name: fontName,
                    characters: characters
                })
            });

            const result = await response.json();

            clearInterval(progressInterval);
            progressFill.style.width = '100%';

            if (response.ok) {
                setTimeout(() => {
                    this.showResult(result);
                    progressSection.hidden = true;
                }, 800);
            } else {
                throw new Error(result.error || '生成失败');
            }
        } catch (error) {
            clearInterval(progressInterval);
            console.error('❌ 生成失败:', error);
            this.showTemporaryMessage('生成失败: ' + error.message, 'error');
            progressSection.hidden = true;
        } finally {
            createBtn.disabled = false;
        }
    }

    showResult(result) {
        const resultSection = document.getElementById('resultSection');
        const message = document.getElementById('resultMessage');

        resultSection.hidden = false;
        message.textContent = result.message || '你的WriteRight字体已经制作完成啦！快下载试试吧！';
        
        this.generatedFontPath = result.font_path;

        // 滚动到结果区域
        resultSection.scrollIntoView({ behavior: 'smooth' });
    }

    downloadFont() {
        if (this.generatedFontPath) {
            const filename = this.generatedFontPath.split('/').pop();
            window.open(`/download/${filename}`, '_blank');
            this.showTemporaryMessage('开始下载字体文件！', 'success');
        }
    }

    restartProcess() {
        // 重置界面
        this.uploadedFiles.clear();
        this.currentTaskId = null;
        this.generatedFontPath = null;
        
        // 重置所有字符项
        document.querySelectorAll('.char-item').forEach(item => {
            item.classList.remove('uploaded');
            const preview = item.querySelector('.char-preview');
            preview.style.backgroundImage = '';
            preview.classList.remove('has-image');
            item.querySelector('.upload-indicator').textContent = '点击上传';
        });
        
        document.getElementById('fileList').style.display = 'none';
        document.getElementById('resultSection').hidden = true;
        document.getElementById('fontName').value = '我的WriteRight字体';
        
        this.updateUploadStats();
        this.createNewTask();
        
        this.showTemporaryMessage('准备好创造新的字体了吗？', 'info');
        
        // 滚动到顶部
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    showTemporaryMessage(text, type = 'info') {
        // 创建消息元素
        const message = document.createElement('div');
        message.textContent = text;
        message.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            border-radius: 15px;
            color: white;
            font-weight: bold;
            z-index: 1000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        `;

        // 设置颜色基于类型
        const colors = {
            success: 'linear-gradient(135deg, #4CAF50, #45a049)',
            error: 'linear-gradient(135deg, #ff6b6b, #ff5252)',
            warning: 'linear-gradient(135deg, #ffd166, #ffb74d)',
            info: 'linear-gradient(135deg, var(--accent-blue), #64b5f6)'
        };

        message.style.background = colors[type] || colors.info;

        document.body.appendChild(message);

        // 显示动画
        setTimeout(() => {
            message.style.transform = 'translateX(0)';
        }, 100);

        // 3秒后自动隐藏
        setTimeout(() => {
            message.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (message.parentNode) {
                    message.parentNode.removeChild(message);
                }
            }, 300);
        }, 3000);
    }
}

// 创建应用实例
const app = new WriteRightApp();

// 添加欢迎消息
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        app.showTemporaryMessage('欢迎使用 WriteRight！✨ 开始上传你的手写字符吧！', 'info');
    }, 1000);
});
