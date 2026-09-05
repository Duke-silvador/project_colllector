# test_batch_upload.py
import requests
import json
from datetime import datetime
import os
from PyQt5.QtWidgets import QFileDialog

# 1. 先登录获取token
def get_access_token():
    login_url = "https://biop.tylin.com.cn/bddrs/auth/login"
    login_data = {
        "clientId": "f8f7e5bf883bb2651269ec05bb18e93d",
        "clientSecret": "ext_robot_paso_20251205",
        "username": "ext_robot_paso",
        "password": "#paso@20251205"
    }
    
    try:
        response = requests.post(login_url, json=login_data, timeout=10)
        print(f"gyf:response={response}")
        result = response.json()
        
        if result['code'] == 200:
            access_token = result['data']['access_token']
            client_id = result['data']['client_id']
            print(f"✓ 登录成功，获取到token")
            print(f"Token前50位: {access_token[:50]}...")
            #return access_token
            return access_token,client_id
        else:
            print(f"✗ 登录失败: {result['message']}")
            return None
    except Exception as e:
        print(f"✗ 登录请求失败: {e}")
        return None
    
class BatchMediaUploader:
    """批量多媒体上传客户端"""
    
    def __init__(self, base_url, token,client_id,bridge_dir,save_img_path=None):
        self.base_url = base_url.rstrip('/')
        self.token = token
        self.headers = {
            "Authorization": f"Bearer {token}",
            "clientId": f"{client_id}",
            # 注意：不要设置Content-Type，requests会自动设置正确的multipart boundary
        }
        self.bridge_dir = bridge_dir
        self.save_img_path = save_img_path
    
    
    def create_metadata(self, filenames):
        """创建元数据"""
        metadata = []
        
        for i, filename in enumerate(filenames):
            #captureTime_v = filename.split("-")[3]+"-"+filename.split("-")[4]
            captureTime_v = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            locationInfo_v = "测试位置"+filename.split("-")[2]
            crackType_v = filename.split(".")[0].split("-")[-1]
            print(f"gyf:captureTime_v={captureTime_v}")
            #print(f"gyf:type captureTime_v={type(captureTime_v)}")
            metadata.append({
                "mediaName": filename,
                "captureTime": captureTime_v,
                "locationInfo":locationInfo_v,
            })
        
        return metadata
    
    def upload_batch(self, request_id=None):
        """执行批量上传"""
        if request_id is None:
            request_id = f"REQ_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        print(f"gyf:self.bridge_dir={self.bridge_dir}")
        # 准备测试文件
        test_files = []
        # directory_img = "D:\\django_gyf\\data\camera\\南纪门大桥\\表观图像（全部）"
        # directory_video = "D:\\django_gyf\\data\camera\\南纪门大桥\\表观图像（有病害）"
        directory_img = "./data/camera/"+self.bridge_dir+"/表观图像（全部）"
        directory_video = "./data/camera/"+self.bridge_dir+"/表观图像（有病害）"
        # 获取目录下的所有文件和文件夹
        for filename in os.listdir(directory_img):
            #num = 0
            file_path = os.path.join(directory_img, filename)
            test_files.append(file_path)
        for filename in os.listdir(directory_video):
            #num = 0
            file_path = os.path.join(directory_video, filename)
            test_files.append(file_path)
        print(f"gyf:test_files={test_files}")
        
        # 创建元数据
        metadata = self.create_metadata([os.path.basename(f) for f in test_files])
        print(f"metadata={metadata}")
        
        # 准备请求数据
        patrolBatch = 9
        data = {
            'requestId': request_id,
            'requestTime': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'patrolBatch':patrolBatch,
            'metadata': json.dumps(metadata, ensure_ascii=False),
        }
        
        # 准备文件
        files = []
        for file_path in test_files:
            mime_type = self.get_mime_type(file_path)
            files.append(('medias', (os.path.basename(file_path), open(file_path, 'rb'), mime_type)))
        
        print(f"开始批量上传，请求ID: {request_id}")
        print(f"文件数量: {len(test_files)}")
        robotCode = "CQJTU_PASO_01"
        projectNo_list = self.query_project_info()
        for projectNo in projectNo_list:
            componentCode_parent,componentCode_child_list = self.query_component_info(projectNo)
            print(f"gyf:componentCode_parent={componentCode_parent}")
            #print(f"gyf:componentCode_child_list={componentCode_child_list}")
            for componentCode in componentCode_child_list:
                try:
                    # 发送请求
                    response = requests.post(
                        f"{self.base_url}/disease/image/receive/{robotCode}/{componentCode}",
                        headers=self.headers,
                        data=data,
                        files=files,
                        timeout=60
                    )
                    
                    print(f"状态码: {response.status_code}")
                    result = response.json()
                    print(f"result={result}")
                    print(f"result.get('code')={result.get('code')}")
                    
                    # 输出结果
                    if result.get('code') == 200 or result.get('code') == 206:
                        #data = result.get('data', {})
                        print(f"\n✅ 图像和视频数据上传完成!")
                        # print(f"请求ID: {data.get('requestId')}")
                        # print(f"总文件数: {data.get('totalFiles')}")
                        # print(f"成功: {data.get('successCount')}")
                        # print(f"失败: {data.get('failCount')}")
                        
                        # #输出每个文件的结果
                        # print("\n文件详情:")
                        # for file_result in data.get('fileResults', []):
                        #     status_icon = "✅" if file_result.get('status') == 'success' else "❌"
                        #     print(f"  {status_icon} {file_result.get('mediaName')}: {file_result.get('status')}")
                        #     if file_result.get('error'):
                        #         print(f"     错误: {file_result.get('error')}")
                    else:
                        print(f"\n❌ 上传失败: {result.get('message')}")
                        
                    return result
                    
                except Exception as e:
                    print(f"\n❌ 请求异常: {e}")
                    return None
                    
                finally:
                    # 关闭所有打开的文件
                    for _, file_tuple in files:
                        if hasattr(file_tuple[1], 'close'):
                            file_tuple[1].close()
    
    def upload_single(self, directory,filename, request_id=None):
        """执行单个图像或视频文件上传"""
        if request_id is None:
            request_id = f"REQ_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        print(f"gyf:self.bridge_dir={self.bridge_dir}")
        # 准备测试文件
        test_files = []
        # # directory_img = "D:\\django_gyf\\data\camera\\南纪门大桥\\表观图像（全部）"
        # # directory_video = "D:\\django_gyf\\data\camera\\南纪门大桥\\表观图像（有病害）"
        # directory_img = "./data/camera/"+self.bridge_dir+"/表观图像（全部）"
        # directory_video = "./data/camera/"+self.bridge_dir+"/表观图像（有病害）"
        # # 获取目录下的所有文件和文件夹
        # for filename in os.listdir(directory_img):
        #     #num = 0
        #     file_path = os.path.join(directory_img, filename)
        #     test_files.append(file_path)
        # for filename in os.listdir(directory_video):
        #     #num = 0
        #     file_path = os.path.join(directory_video, filename)
        #     test_files.append(file_path)
        #file_path = os.path.join(directory, filename)
        #file_path = './data/camera/南纪门大桥/表观图像（全部）/NMC1-S-0.01m-2025_11_14-15_03_19-裂纹.jpg'
        test_files.append(self.save_img_path)
        print(f"gyf:test_files={test_files}")
        
        # 创建元数据
        metadata = self.create_metadata([os.path.basename(f) for f in test_files])
        print(f"metadata={metadata}")
        
        # 准备请求数据
        patrolBatch = 9
        data = {
            'requestId': request_id,
            'requestTime': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'patrolBatch':patrolBatch,
            'metadata': json.dumps(metadata, ensure_ascii=False),
        }
        
        # 准备文件
        files = []
        for file_path in test_files:
            mime_type = self.get_mime_type(file_path)
            files.append(('medias', (os.path.basename(file_path), open(file_path, 'rb'), mime_type)))
        
        print(f"开始批量上传，请求ID: {request_id}")
        print(f"文件数量: {len(test_files)}")
        robotCode = "CQJTU_PASO_01"
        projectNo_list = self.query_project_info()
        for projectNo in projectNo_list:
            componentCode_parent,componentCode_child_list = self.query_component_info(projectNo)
            print(f"gyf:componentCode_parent={componentCode_parent}")
            #print(f"gyf:componentCode_child_list={componentCode_child_list}")
            for componentCode in componentCode_child_list:
                try:
                    # 发送请求
                    response = requests.post(
                        f"{self.base_url}/disease/image/receive/{robotCode}/{componentCode}",
                        headers=self.headers,
                        data=data,
                        files=files,
                        timeout=60
                    )
                    
                    print(f"状态码: {response.status_code}")
                    result = response.json()
                    print(f"result={result}")
                    print(f"result.get('code')={result.get('code')}")
                    
                    # 输出结果
                    if result.get('code') == 200 or result.get('code') == 206:
                        #data = result.get('data', {})
                        print(f"\n✅ 图像和视频数据上传完成!")
                        # print(f"请求ID: {data.get('requestId')}")
                        # print(f"总文件数: {data.get('totalFiles')}")
                        # print(f"成功: {data.get('successCount')}")
                        # print(f"失败: {data.get('failCount')}")
                        
                        # #输出每个文件的结果
                        # print("\n文件详情:")
                        # for file_result in data.get('fileResults', []):
                        #     status_icon = "✅" if file_result.get('status') == 'success' else "❌"
                        #     print(f"  {status_icon} {file_result.get('mediaName')}: {file_result.get('status')}")
                        #     if file_result.get('error'):
                        #         print(f"     错误: {file_result.get('error')}")
                    else:
                        print(f"\n❌ 上传失败: {result.get('message')}")
                        
                    return result
                    
                except Exception as e:
                    print(f"\n❌ 请求异常: {e}")
                    return None
                    
                finally:
                    # 关闭所有打开的文件
                    for _, file_tuple in files:
                        if hasattr(file_tuple[1], 'close'):
                            file_tuple[1].close()
        
    
    def get_mime_type(self, filename):
        """根据文件名获取MIME类型"""
        ext = os.path.splitext(filename)[1].lower()
        
        mime_map = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.mp4': 'video/mp4',
            '.avi': 'video/x-msvideo',
            '.mov': 'video/quicktime',
        }
        
        return mime_map.get(ext, 'application/octet-stream')
    
    def query_project_info(self):
        """查询上传记录"""
        try:
            response = requests.get(
                f"{self.base_url}/base/project/optionItems",
                headers=self.headers,
                timeout=10
            )
            
            print(f"状态码: {response.status_code}")
            result = response.json()
            
            if result.get('code') == 200:
                #print(f"gyf:result from query info={result}")
                projectNo_list = []
                data = result.get('data', {})
                print(f"gyf:data from query info={data}")
                for data_i in data:
                    projectNo = data_i.get('projectNo', [])
                    print(f"gyf:projectNo from query info={projectNo}")
                    projectNo_list.append(projectNo)
                return projectNo_list
        except Exception as e:
            print(f"查询失败: {e}")
            return None
    
    def query_component_info(self,projectNo):
        try:
            response = requests.get(
                f"{self.base_url}/base/component/byProject/{projectNo}",
                headers=self.headers,
                timeout=10
            )
            
            print(f"状态码: {response.status_code}")
            result = response.json()
            
            if result.get('code') == 200:
                #print(f"gyf:result from query info={result}")
                componentCode_list = []
                projectNo_list = []
                data = result.get('data',[])
                #print(f"gyf:data from query info={data}")
                # for data_i in data:
                #     #一个data_i对应一座桥
                #     componentCode_child_list = []
                #     componentCode_parent = data_i.get('componentCode', [])
                #     print(f"gyf:componentCode_parent from query info={componentCode_parent}")
                #     children = data_i.get('children', [])
                #     for children_i in children:
                #         componentCode_child = children_i.get('componentCode', [])
                #         componentCode_child_list.append(componentCode_child)
                #     print(f"gyf:componentCode_child_list from query info={componentCode_child_list}")
                #     componentCode_list.append(componentCode_parent)
                
                #默认仅支持单独一座桥的数据,即data[0]
                componentCode_child_list = []
                componentCode_parent = data[0].get('componentCode', [])
                print(f"gyf:componentCode_parent from query info={componentCode_parent}")
                children = data[0].get('children', [])
                for children_i in children:
                    componentCode_child = children_i.get('componentCode', [])
                    componentCode_child_list.append(componentCode_child)
                #print(f"gyf:componentCode_child_list from query info={componentCode_child_list}")
                return componentCode_parent,componentCode_child_list
        except Exception as e:
            print(f"查询失败: {e}")
            return None

# 使用示例
if __name__ == "__main__":
    # 配置
    #BASE_URL = "http://localhost:8000/api"
    TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzcwNDEyMTkwLCJpYXQiOjE3NzAzODMzOTAsImp0aSI6IjNjNzJkZjQ2ZGFiYTQ1YTlhZGJmMTZmM2ZhOTcxNmIyIiwidXNlcl9pZCI6MiwiaXNzIjoiYm9kZHJzIiwic3ViIjoiZ3lmIn0.keQnRkBXX6_r4D65HhOK_heK7X1WSl4u4TfxtX51_Qc"
    upload_url = "http://localhost:8000/"

    token,client_id = get_access_token()
    # 安装依赖
    try:
        from PIL import Image
    except ImportError:
        print("安装Pillow库...")
        os.system("pip install Pillow")
        from PIL import Image
    
    # 创建上传器
    uploader = BatchMediaUploader(upload_url, token,client_id)
    
    print("=" * 60)
    print("批量多媒体上传测试")
    print("=" * 60)
    
    # 1. 执行批量上传
    result = uploader.upload_batch()
    
    print("\n" + "=" * 60)
    
    # 2. 查询上传记录
    # if result and result.get('code') in [200, 206]:
    #     # 等待一下再查询
    #     import time
    #     time.sleep(1)
    #     uploader.query_upload_records()