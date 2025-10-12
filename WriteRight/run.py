from flask import Flask, render_template, request, jsonify, send_file
import os
import uuid
import json
import traceback
from werkzeug.utils import secure_filename
from make_font import FontMaker
from process_images import ImageProcessor

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key'
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


@app.route('/upload', methods=['POST'])
def upload_images():
    """处理用户上传的图片"""
    try:
        if 'files' not in request.files:
            return jsonify({'error': '请选择文件'}), 400

        files = request.files.getlist('files')
        if len(files) == 0 or (len(files) == 1 and files[0].filename == ''):
            return jsonify({'error': '没有选择文件'}), 400

        # 创建任务ID
        task_id = str(uuid.uuid4())
        task_folder = os.path.join(app.config['UPLOAD_FOLDER'], task_id)
        os.makedirs(task_folder, exist_ok=True)

        # 保存文件
        saved_count = 0
        for file in files:
            if file and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                file_path = os.path.join(task_folder, filename)
                file.save(file_path)
                saved_count += 1

        if saved_count == 0:
            return jsonify({'error': '没有有效的图片文件'}), 400

        return jsonify({
            'task_id': task_id,
            'file_count': saved_count,
            'message': f'成功上传 {saved_count} 个文件'
        })

    except Exception as e:
        return jsonify({'error': f'上传处理失败: {str(e)}'}), 500


@app.route('/create_font', methods=['POST'])
def create_font():
    """创建字体文件"""
    try:
        data = request.json
        task_id = data.get('task_id')
        font_name = data.get('font_name', '我的字体')
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
            'message': '字体创建成功！'
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
    print("🎨 手写字体生成器启动中...")
    print("📍 访问地址: http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)
