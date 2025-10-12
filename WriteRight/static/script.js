class KawaiiFontMaker {
    constructor() {
        this.uploadedFiles = [];
        this.currentTaskId = null;
        this.generatedFontPath = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupCharacterSets();
    }

    setupEventListeners() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const createBtn = document.getElementById('createBtn');
        const downloadBtn = document.getElementById('downloadBtn');
        const restartBtn = document.getElementById('restartBtn');

        // 上传区域事件
        uploadArea.addEventListener('click', () => fileInput.click());
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.background = 'linear-gradient(135deg, #e3f2fd, #bbdefb)';
            uploadArea.style.borderColor = 'var(--primary-pink)';
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.style.background = 'linear-gradient(135deg, #f8fbff, #f0f8ff)';
            uploadArea.style.borderColor = 'var(--accent-blue)';
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.background = 'linear-gradient(135deg, #f8fbff, #f0f8ff)';
            uploadArea.style.borderColor = 'var(--accent-blue)';
            this.handleFiles(e.dataTransfer.files);
        });

        fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });

        // 按钮事件
        createBtn.addEventListener('click', () => this.createFont());
        downloadBtn.addEventListener('click', () => this.downloadFont());
        restartBtn.addEventListener('click', () => this.restartProcess());
    }

    setupCharacterSets() {
        const charSetButtons = document.querySelectorAll('.char-set-btn');
        const textarea = document.getElementById('characters');
        
        const characterSets = {
            basic: `ABCDEFGHIJKLMNOPQRSTUVWXYZ\nabcdefghijklmnopqrstuvwxyz\n0123456789`,
            extended: `ABCDEFGHIJKLMNOPQRSTUVWXYZ\nabcdefghijklmnopqrstuvwxyz\n0123456789\n.,!?;:- ()[]{}`,
            custom: ''
        };

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

    handleFiles(files) {
        const imageFiles = Array.from(files).filter(file => {
            const isValidType = file.type.startsWith('image/');
            if (!isValidType) {
                this.showTemporaryMessage('只能上传图片文件哦！', 'error');
                return false;
            }
            return true;
        });

        if (imageFiles.length === 0) {
            this.showTemporaryMessage('请选择有效的图片文件！', 'error');
            return;
        }

        // 检查文件数量
        if (this.uploadedFiles.length + imageFiles.length > 100) {
            this.showTemporaryMessage('一次最多上传100个文件哦！', 'error');
            return;
        }

        this.uploadedFiles = [...this.uploadedFiles, ...imageFiles];
        this.updateFileList();
        this.uploadToServer(imageFiles);
        
        this.showTemporaryMessage(`成功添加 ${imageFiles.length} 个文件！`, 'success');
    }

    updateFileList() {
        const filesContainer = document.getElementById('filesContainer');
        const fileCount = document.getElementById('fileCount');
        
        filesContainer.innerHTML = '';
        fileCount.textContent = `${this.uploadedFiles.length} 个文件`;

        this.uploadedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <div class="file-info">
                    <span class="file-icon">📄</span>
                    <span>${file.name}</span>
                </div>
                <button class="remove-file" onclick="app.removeFile(${index})">
                    🗑️ 删除
                </button>
            `;
            filesContainer.appendChild(fileItem);
        });

        // 显示/隐藏文件列表
        const fileList = document.getElementById('fileList');
        fileList.style.display = this.uploadedFiles.length > 0 ? 'block' : 'none';
    }

    removeFile(index) {
        this.uploadedFiles.splice(index, 1);
        this.updateFileList();
        this.showTemporaryMessage('文件已删除', 'info');
    }

    async uploadToServer(files) {
        const formData = new FormData();
        files.forEach(file => formData.append('files', file));

        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                this.currentTaskId = result.task_id;
                console.log('🎉 上传成功:', result.message);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('❌ 上传失败:', error);
            this.showTemporaryMessage('上传失败: ' + error.message, 'error');
        }
    }

    async createFont() {
        if (!this.currentTaskId) {
            this.showTemporaryMessage('请先上传手写图片！', 'error');
            return;
        }

        if (this.uploadedFiles.length < 5) {
            this.showTemporaryMessage('建议至少上传5个字符以获得更好的效果！', 'warning');
            // 继续执行，不阻止
        }

        const fontName = document.getElementById('fontName').value.trim() || '我的萌系字体';
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
                }, 800);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            clearInterval(progressInterval);
            console.error('❌ 生成失败:', error);
            this.showTemporaryMessage('生成失败: ' + error.message, 'error');
        } finally {
            createBtn.disabled = false;
            progressSection.hidden = true;
        }
    }

    showResult(result) {
        const resultSection = document.getElementById('resultSection');
        const message = document.getElementById('resultMessage');

        resultSection.hidden = false;
        message.textContent = result.message || '你的专属字体已经制作完成啦！快下载试试吧！';
        
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
        this.uploadedFiles = [];
        this.currentTaskId = null;
        this.generatedFontPath = null;
        
        document.getElementById('fileList').style.display = 'none';
        document.getElementById('resultSection').hidden = true;
        document.getElementById('fontName').value = '我的萌系字体';
        
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
const app = new KawaiiFontMaker();

// 添加一些初始化提示
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        app.showTemporaryMessage('欢迎来到萌系字体工坊！✨', 'info');
    }, 1000);
});