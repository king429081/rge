#!/bin/bash

# 阿里云 ECS 部署脚本

# 1. 安装 Docker (如果未安装)
if ! command -v docker &> /dev/null; then
    echo "安装 Docker..."
    curl -fsSL https://get.docker.com | bash
    systemctl start docker
    systemctl enable docker
fi

# 2. 安装 Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "安装 Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# 3. 复制项目文件到服务器
# 使用 scp: scp -r /path/to/rge root@你的ECS_IP:/root/

# 4. 进入项目目录
# cd /root/rge

# 5. 创建环境变量文件
cat > .env << 'EOF'
# Qdrant Cloud (使用你的云端 Qdrant)
QDRANT_URL=https://584af7da-5b21-4a80-8bb4-416dbbb6bfc1.us-east4-0.gcp.cloud.qdrant.io:6333
QDRANT_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.QmqGilCus9vTZCHXvkF3bw-rszTtRj8GtLnFkjP-f38

# MiniMax API
MINIMAX_API_KEY=sk-cp-NMCZTmS0NNdeHAt0q1u5cIx6tTgdI8yvR7XjvSrWVqjBeFFz0i879cIsyIyTUCheBPb7hD6zwpQSgwrdDzPChALLZOMnt3KVXS_8b2y2ZiR5LxE5aZo2wCY
EOF

# 6. 启动服务
docker-compose up -d --build

echo "部署完成！"
echo "前端: http://你的ECS_IP:5173"
echo "后端: http://你的ECS_IP:3001"
