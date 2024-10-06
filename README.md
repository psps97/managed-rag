# 완전관리형 RAG 구성하기

<p align="left">
    <a href="https://hits.seeyoufarm.com"><img src="https://hits.seeyoufarm.com/api/count/incr/badge.svg?url=https%3A%2F%2Fgithub.com%2Fkyopark2014%2Fmanaged-rag&count_bg=%2379C83D&title_bg=%23555555&icon=&icon_color=%23E7E7E7&title=hits&edge_flat=false)](https://hits.seeyoufarm.com"/></a>
    <img alt="License" src="https://img.shields.io/badge/LICENSE-MIT-green">
</p>


여기에서는 완전관리형 RAG(Fully Managed RAG)를 이용하여 편리하게 RAG 구성하는 방법을 설명합니다.

## 데이터 소스 동기화

Boto3의 [create_data_source](https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/bedrock-agent/client/create_data_source.html)을 이용하여 데이터 동기화를 요청합니다.

여기에서는 사용자가 파일이 올릴때에 동기화를 요청합니다. 대량으로 파일들을 동기화할 경우에는 Amazon S3에 파일을 업로드하고 knowledge base에서 수동으로 동기화를 하거나 event bridge를 이용해 정기적으로 동기화를 수행합니다. 
