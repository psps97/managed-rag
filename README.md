# 완전관리형 RAG 구성하기

<p align="left">
    <a href="https://hits.seeyoufarm.com"><img src="https://hits.seeyoufarm.com/api/count/incr/badge.svg?url=https%3A%2F%2Fgithub.com%2Fkyopark2014%2Fmanaged-rag&count_bg=%2379C83D&title_bg=%23555555&icon=&icon_color=%23E7E7E7&title=hits&edge_flat=false)](https://hits.seeyoufarm.com"/></a>
    <img alt="License" src="https://img.shields.io/badge/LICENSE-MIT-green">
</p>


여기에서는 완전관리형 RAG(Fully Managed RAG)를 이용하여 편리하게 RAG 구성하는 방법을 설명합니다.


## 진행현황

CDK로 AOSS 설치후 Knowledge Base를 연결할때 index name이 필요한데, index name은 Lambda로 생성되므로, 한꺼번에 빌드하지 못하는 이슈가 있습니다. 

Knowledge base에서 신규 생성시는 "bedrock-knowledge-base-default-index"라는 초기값을 가지나, CDK로 설치시는 아래와 같은 에러가 발생합니다. 따라서 현재 구조에서는 CDK로 OpenSearch Serverless와 Knowledge Base를 동시에 설치할 수 없습니다. 

```text
4:46:41 AM | CREATE_FAILED        | AWS::Bedrock::KnowledgeBase               | knowledgebaseformanagedragchatbot
Resource handler returned message: "The knowledge base storage configuration provided is invalid... no such index [bedrock-knowledge-base-default-index] (Service: BedrockAgent, Stat
us Code: 400, Request ID: a9880897-4eac-462c-917f-4438a0f42917)" (RequestToken: 9c25d0e5-cbc2-9b2c-a2a0-ad22b4bf544a, HandlerErrorCode: InvalidRequest)
```


## Reference

[class CfnKnowledgeBase (construct)](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_bedrock.CfnKnowledgeBase.html)

[class CfnCollection (construct)](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_opensearchserverless.CfnCollection.html)

[Encryption in Amazon OpenSearch Serverless](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless-encryption.html)

[On AWS CDK and Amazon Bedrock Knowledge bases](https://medium.com/@micheldirk/on-aws-cdk-and-amazon-bedrock-knowledge-bases-14c7b208e4cb)

[AOSS OpenSearch Serverless Development using AWS CDK](https://www.pujan.net/posts/opensearch-serverless-development-using-aws-cdk/)

[Building Q&A application using Knowledge Bases for Amazon Bedrock - Retrieve API](https://github.com/aws-samples/amazon-bedrock-workshop/blob/main/02_KnowledgeBases_and_RAG/3_Langchain-rag-retrieve-api-claude-3.ipynb)

[Knowledge Bases for Amazon Bedrock with LangChain](https://medium.com/@dminhk/knowledge-bases-for-amazon-bedrock-with-langchain-%EF%B8%8F-6cd489646a5c)

[Amazon Bedrock Workshop](https://catalog.us-east-1.prod.workshops.aws/workshops/a4bdb007-5600-4368-81c5-ff5b4154f518/en-US)

[Amazon Bedrock Knowledge Base](https://github.com/aws-samples/amazon-bedrock-workshop/tree/main/02_KnowledgeBases_and_RAG)
