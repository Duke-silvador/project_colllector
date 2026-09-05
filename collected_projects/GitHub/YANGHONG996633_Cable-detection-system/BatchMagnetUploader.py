# test_batch_upload.py
import requests
import json
from datetime import datetime
import os
from PyQt5.QtWidgets import QFileDialog
import pandas as pd
import time

#1. 先登录获取token
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
    
class BatchMagnetUploader:
    """批量磁信号上传客户端"""
    
    def __init__(self, query_base_url, token,client_id,bridge_dir):
        self.query_base_url = query_base_url.rstrip('/')
        self.token = token
        self.headers = {
            "Authorization": f"Bearer {token}",
            "clientId": f"{client_id}",
            # 注意：不要设置Content-Type，requests会自动设置正确的multipart boundary
        }
        self.bridge_dir = bridge_dir
    
    
    
    def upload_batch(self, request_id=None):
        """执行批量上传"""
        url = "https://biop.tylin.com.cn/njm/api/mag/receive"
    
        headers = {
            "Content-Type": "application/json",
            "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1aWQiOiI0ODk5MmZkODcyYTU0ZTQ0YWIzMDBiMzcwNmE2MGU2MCIsImV4cGlyZV90aW1lIjoxNzY2MTM2NjE1MDkwfQ.WyMUZM40HhJQmIdXcwLxX2W5Fk63AptJx9sifCFkLRE",
            "clientId": "48992fd872a54e44ab300b3706a60e60"
        }
        #df = pd.read_excel('NMC1-S_20251114_153106-内部病害检测结果.xlsx')
        excel_dir = "./data/sensor_data" 
        # 获取目录下所有Excel文件
        excel_files = []
        for file in os.listdir(excel_dir):
            if file.endswith(('.xlsx', '.xls')):
                excel_files.append(os.path.join(excel_dir, file))
        
        if not excel_files:
            print(f"在目录 {excel_dir} 中没有找到Excel文件")
            return
        
        print(f"找到 {len(excel_files)} 个Excel文件")

        # 遍历每个Excel文件并上传
        for excel_file in excel_files:
            try:
                print(f"\n正在处理文件: {os.path.basename(excel_file)}")
                
                # 读取Excel文件中的数据
                df = pd.read_excel(excel_file)
                
                # 将DataFrame转换为所需的格式
                test_data = []
                for index, row in df.iterrows():
                    test_data.append({
                        "distance": row['distance'],
                        "bx1": row['bx1'],
                        "bx2": row['bx2'],
                        "bx3": row['bx3'],
                        "bx4": row['bx4'],
                        "bx5": row['bx5'],
                        "bx6": row['bx6'],
                        "kValue": row['kValue'],
                        "threshold": row['threshold'],
                        "evaluateResult": row['evaluateResult']
                    })
                
                # 从文件名提取信息（可选）
                # 假设文件名格式为：项目代码_机器人代码_组件代码.xlsx
                file_name = os.path.basename(excel_file).replace('.xlsx', '').replace('.xls', '')
                name_parts = file_name.split('_')
                projectCode = "GDQ_NJM"
                robotCode = "CQJTU_PASO_01"
                robotName = "南纪门轨道专用桥爬索机器人"
                robotType = "PASO"
                component_name = "SSC1下游斜拉索(测试_yangbw)"
                patrol_Batch = 9

                #component_Code = "SSC1-X"
                #调用查询接口获取componentCode
                component_Code = ""
                robotCode = "CQJTU_PASO_01"
                projectNo_list = self.query_project_info()
                for projectNo in projectNo_list:
                    componentCode_parent,componentCode_child_list = self.query_component_info(projectNo)
                    print(f"gyf:componentCode_parent={componentCode_parent}")
                    #print(f"gyf:componentCode_child_list={componentCode_child_list}")
                    for componentCode in componentCode_child_list:
                        if componentCode == "SSC1-X":
                            component_Code = componentCode
                print(f"gyf:component_Code={component_Code}")
                
                data = {
                    "projectCode": projectCode,
                    "robotCode": robotCode,
                    "robotName": robotName,
                    "robotType": robotType,
                    "patrolDate": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    "componentCode": component_Code,
                    "componentName": component_name,
                    "patrolBatch": patrol_Batch,
                    "data": test_data
                }
                # 上传数据
                print(f"开始上传 {len(test_data)} 条磁信号数据...")
                try:
                    start = time.time()
                    response = requests.post(url, headers=headers, json=data)
                    print(f"上传完成，耗时: {time.time() - start:.2f}s")
                    print(f"响应状态码: {response.status_code}")
                    
                    if response.status_code == 200:
                        print("✅磁信号上传成功！")
                    else:
                        print(f"上传失败: {response.text}")       
                except Exception as e:
                    print(f"处理文件 {excel_file} 时出错: {str(e)}")
                    continue
            except Exception as e:
                print(f"处理文件 {excel_file} 时出错: {str(e)}")
                continue
    
    def query_project_info(self):
        """查询上传记录"""
        try:
            response = requests.get(
                f"{self.query_base_url}/base/project/optionItems",
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
                f"{self.query_base_url}/base/component/byProject/{projectNo}",
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
    uploader = BatchMagnetUploader(upload_url, token,client_id)
    
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