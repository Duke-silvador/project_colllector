import pymysql

connection = pymysql.connect(
    host="gateway01.ap-northeast-1.prod.aws.tidbcloud.com",
    port=4000,
    user="3fqKJnm2X242V6J.root",
    password="q7dGVj0NnvAI1NPi",
    database="sys",
    ssl_verify_cert=True,
    ssl_verify_identity=True,
    ssl_ca=r"D:\Vanshika\AI CareerCopilot\ca.pem"
)

print("Database connected successfully!")

connection.close()