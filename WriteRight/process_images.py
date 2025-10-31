import cv2
import numpy as np
import os
from PIL import Image

class ImageProcessor:
    def process_images(self, folder_path):
        """处理文件夹中的所有图片"""
        processed = {}
        
        for filename in os.listdir(folder_path):
            if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.gif')):
                file_path = os.path.join(folder_path, filename)
                
                try:
                    # 读取图片
                    img = self.read_image(file_path)
                    if img is not None:
                        # 预处理
                        processed_img = self.clean_image(img)
                        # 使用文件名（不含扩展名）作为字符名
                        char_name = os.path.splitext(filename)[0]
                        processed[char_name] = processed_img
                        
                except Exception as e:
                    print(f"处理图片 {filename} 时出错: {e}")
                    continue
        
        return processed
    
    def process_single_image(self, file):
        """处理单个上传的图片文件"""
        try:
            # 将文件对象转换为OpenCV图像
            file_bytes = np.frombuffer(file.read(), np.uint8)
            img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
            
            if img is None:
                raise ValueError("无法读取图片文件")
            
            # 使用现有的预处理流程
            processed_img = self.clean_image(img)
            return processed_img
            
        except Exception as e:
            print(f"处理图片失败: {str(e)}")
            raise
    
    def read_image(self, path):
        """读取图片文件"""
        try:
            return cv2.imread(path)
        except:
            return None
    
    def clean_image(self, img):
        """清理和预处理图片"""
        # 转为灰度图
        if len(img.shape) == 3:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        else:
            gray = img
        
        # 二值化
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        
        # 去除噪点
        kernel = np.ones((2, 2), np.uint8)
        cleaned = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)
        
        # 统一尺寸
        resized = self.resize_image(cleaned)
        
        return resized
    
    def resize_image(self, img, size=(100, 100)):
        """调整图片尺寸"""
        # 找到字符区域
        coords = cv2.findNonZero(img)
        if coords is None:
            return cv2.resize(img, size)
        
        x, y, w, h = cv2.boundingRect(coords)
        char_region = img[y:y+h, x:x+w]
        
        return cv2.resize(char_region, size, interpolation=cv2.INTER_AREA)
