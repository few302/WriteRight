import os
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import random

class FontMaker:
    def __init__(self):
        self.common_chars = {
            'letters': 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
            'numbers': '0123456789',
            'symbols': '.,!?;:- ()'
        }
    
    def create_font_file(self, character_images, font_name, output_dir, characters=''):
        """创建字体文件"""
        try:
            # 检查输入参数
            if not character_images:
                raise ValueError("没有可用的字符图像数据")
            
            if not font_name or not font_name.strip():
                font_name = "WriteRight字体"
            
            # 原有的字符处理逻辑...
            if not characters:
                characters = self.common_chars['letters'] + self.common_chars['numbers']
            
            characters = characters.replace('\n', '').replace('\r', '').replace(' ', '')
            
            # 创建字体数据
            font_data = self.build_font_data(character_images, characters)
            
            # 生成字体文件
            return self.generate_font_package(font_data, font_name, output_dir)
            
        except Exception as e:
            print(f"字体生成错误: {str(e)}")
            raise
    
    def build_font_data(self, user_images, target_chars):
        """构建字体数据"""
        font_data = {}
        
        for char in target_chars:
            if char in user_images:
                # 使用用户提供的字符图片
                font_data[char] = user_images[char]
            else:
                # 生成模拟字符
                font_data[char] = self.make_similar_char(char, user_images)
        
        return font_data
    
    def make_similar_char(self, char, existing_chars):
        """生成相似的字符"""
        # 创建基础字符图片
        img = Image.new('L', (100, 100), color=255)
        draw = ImageDraw.Draw(img)
        
        try:
            font = ImageFont.truetype("arial.ttf", 70)
        except:
            font = ImageFont.load_default()
        
        # 绘制字符
        bbox = draw.textbbox((0, 0), char, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        x = (100 - text_width) // 2
        y = (100 - text_height) // 2
        
        draw.text((x, y), char, fill=0, font=font)
        
        # 转为numpy数组并添加手写感
        img_array = np.array(img)
        handwrite_style = self.add_handwriting_style(img_array)
        
        return handwrite_style
    
    def add_handwriting_style(self, img):
        """添加手写风格"""
        result = img.copy()
        h, w = result.shape
        
        # 轻微扭曲
        for i in range(h):
            shift = random.randint(-1, 1)
            if 0 <= i + shift < h:
                result[i] = img[i + shift]
        
        # 随机噪点
        noise = np.random.random((h, w)) > 0.97
        result[noise] = 255 - result[noise]
        
        return result
    
    def generate_font_package(self, font_data, font_name, output_dir):
        """生成字体包"""
        # 创建字符图片文件夹
        chars_dir = os.path.join(output_dir, f"{font_name}_characters")
        os.makedirs(chars_dir, exist_ok=True)
        
        # 保存所有字符图片
        font_info = {
            'name': font_name,
            'character_count': len(font_data),
            'created_date': '2024-01-01',
            'generator': 'WriteRight'
        }
        
        for char, img_array in font_data.items():
            img = Image.fromarray(img_array)
            char_code = ord(char)
            img.save(os.path.join(chars_dir, f"{char_code:04d}.png"))
        
        # 保存字体信息
        info_path = os.path.join(output_dir, f"{font_name}_info.json")
        with open(info_path, 'w', encoding='utf-8') as f:
            json.dump(font_info, f, ensure_ascii=False, indent=2)
        
        print(f"✅ WriteRight字体 '{font_name}' 创建完成！")
        print(f"📍 包含字符: {len(font_data)} 个")
        
        return info_path
