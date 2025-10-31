from flask import Flask, render_template, request, jsonify, send_file
import os
import uuid
import json
import traceback
import cv2
import numpy as np
from werkzeug.utils import secure_filename
from make_font import FontMaker
from process_images import ImageProcessor

app = Flask(__name__)
app.config['SECRET_KEY'] = 'write-right-secret-key-2024'
app.config['UPLOAD_FOLDER'] = 'user_uploads'
app.config['OUTPUT_FOLDER'] = 'output_fonts'

# 创建必要的文件夹
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['OUTPUT_FOLDER'], exist_ok=True)

# 允许的图片格式
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/create_task', methods=['POST'])
def create_task():
    """创建新的字体生成任务"""
    try:
        task_id = str(uuid.uuid4())
        task_folder = os.path.join(app.config['UPLOAD_FOLDER'], task_id)
        os.makedirs(task_folder, exist_ok=True)
        
        return jsonify({
            'success': True,
            'task_id': task_id,
            'message': '任务创建成功'
        })
    except Exception as e:
        return jsonify({'error': f'创建任务失败: {str(e)}'}), 500

@app.route('/upload_char', methods=['POST'])
def upload_char():
    """上传单个字符图片"""
    try:
        char = request.form.get('char')
        task_id = request.form.get('task_id')
        file = request.files.get('file')
        
        if not char or not task_id or not file:
            return jsonify({'error': '缺少必要参数'}), 400
        
        # 验证任务文件夹存在
        task_folder = os.path.join(app.config['UPLOAD_FOLDER'], task_id)
        if not os.path.exists(task_folder):
            return jsonify({'error': '任务不存在'}), 404
        
        if not allowed_file(file.filename):
            return jsonify({'error': '不支持的文件格式'}), 400
        
        # 保存字符图片，使用字符作为文件名
        filename = f"{char}.png"
        file_path = os.path.join(task_folder, filename)
        
        # 处理图片：调整大小并保存为PNG
        processor = ImageProcessor()
        processed_img = processor.process_single_image(file)
        cv2.imwrite(file_path, processed_img)
        
        return jsonify({
            'success': True,
            'message': f'字符 {char} 上传成功',
            'char': char
        })
        
    except Exception as e:
        print(f"上传字符失败: {traceback.format_exc()}")
        return jsonify({'error': f'上传失败: {str(e)}'}), 500

@app.route('/create_font', methods=['POST'])
def create_font():
    """创建字体文件"""
    try:
        data = request.json
        task_id = data.get('task_id')
        font_name = data.get('font_name', 'WriteRight字体')
        characters = data.get('characters', '')
        
        if not task_id:
            return jsonify({'error': '任务ID不存在'}), 400
        
        task_folder = os.path.join(app.config['UPLOAD_FOLDER'], task_id)
        if not os.path.exists(task_folder):
            return jsonify({'error': '任务文件夹不存在'}), 404
        
        # 处理图片
        processor = ImageProcessor()
        character_images = processor.process_images(task_folder)
        
        if not character_images:
            return jsonify({'error': '没有成功处理任何图片文件'}), 400
        
        # 生成字体
        maker = FontMaker()
        font_path = maker.create_font_file(
            character_images, 
            font_name, 
            app.config['OUTPUT_FOLDER'],
            characters
        )
        
        return jsonify({
            'success': True,
            'font_path': font_path,
            'font_name': font_name,
            'message': 'WriteRight字体创建成功！'
        })
        
    except Exception as e:
        print(f"字体生成错误: {traceback.format_exc()}")
        return jsonify({'error': f'创建失败: {str(e)}'}), 500

@app.route('/download/<filename>')
def download_font(filename):
    """下载字体文件"""
    try:
        safe_filename = secure_filename(filename)
        file_path = os.path.join(app.config['OUTPUT_FOLDER'], safe_filename)
        
        if not os.path.exists(file_path):
            return jsonify({'error': '文件不存在'}), 404
            
        return send_file(
            file_path,
            as_attachment=True,
            download_name=safe_filename
        )
    except Exception as e:
        return jsonify({'error': f'下载失败: {str(e)}'}), 500

if __name__ == '__main__':
    print("✍️ WriteRight 手写字体生成器启动中...")
    print("📍 访问地址: http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)

