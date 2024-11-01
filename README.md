# 완전관리형 RAG 구성하기

<p align="left">
    <a href="https://hits.seeyoufarm.com"><img src="https://hits.seeyoufarm.com/api/count/incr/badge.svg?url=https%3A%2F%2Fgithub.com%2Fkyopark2014%2Fmanaged-rag&count_bg=%2379C83D&title_bg=%23555555&icon=&icon_color=%23E7E7E7&title=hits&edge_flat=false)](https://hits.seeyoufarm.com"/></a>
    <img alt="License" src="https://img.shields.io/badge/LICENSE-MIT-green">
</p>


여기에서는 완전관리형 RAG(Fully Managed RAG)를 이용하여 편리하게 RAG를 구성하는 방법을 설명합니다. 전체적인 architecture는 아래와 같습니다. 여기에서는 변화하는 트래픽을 쉽게 관리하고 및 유지보수등이 용이한 serverless architecture를 이용합니다. 지식 저장소(knowledge store)로는 OpenSearch serverless를 활용하는 Amazon Bedrock Knowledge Base를 이용합니다. 

![image](https://github.com/user-attachments/assets/b3a93dc6-110b-4cce-aad1-d8a92f957d93)


## 구현 주요 내용

### OpenSearch 생성

Knowledge base를 사용하기 위해서는 serverless opensearch를 사용하여야 합니다. [cdk-managed-rag-stack.ts](./cdk-managed-rag/lib/cdk-managed-rag-stack.ts)에서는 아래와 같이 serverless opensearch를 생성합니다.

먼저 knowledge base를 위한 Role을 생성합니다.
```typescript
const knowledge_base_role = new iam.Role(this,  `role-knowledge-base-for-${projectName}`, {
    roleName: `role-knowledge-base-for-${projectName}-${region}`,
    assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal("bedrock.amazonaws.com")
    )
});
      
const bedrockInvokePolicy = new iam.PolicyStatement({ 
    effect: iam.Effect.ALLOW,
    resources: [
        `arn:aws:bedrock:${region}::foundation-model/anthropic.claude-3-haiku-20240307-v1:0`,
        `arn:aws:bedrock:${region}::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0`,
        `arn:aws:bedrock:${region}::foundation-model/amazon.titan-embed-text-v1`,
        `arn:aws:bedrock:${region}::foundation-model/amazon.titan-embed-text-v2:0`
    ],
    actions: [
        "bedrock:InvokeModel", 
        "bedrock:InvokeModelEndpoint", 
        "bedrock:InvokeModelEndpointAsync",        
    ],
});        

knowledge_base_role.attachInlinePolicy( 
    new iam.Policy(this, `bedrock-invoke-policy-for-${projectName}`, {
        statements: [bedrockInvokePolicy],
    }),
);  
      
const bedrockKnowledgeBaseS3Policy = new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    resources: ['*'],
    actions: [
        "s3:GetBucketLocation",
        "s3:GetObject",
        "s3:ListBucket",
        "s3:ListBucketMultipartUploads",
        "s3:ListMultipartUploadParts",
        "s3:AbortMultipartUpload",
        "s3:CreateBucket",
        "s3:PutObject",
        "s3:PutBucketLogging",
        "s3:PutBucketVersioning",
        "s3:PutBucketNotification",
    ],
});

knowledge_base_role.attachInlinePolicy( 
    new iam.Policy(this, `knowledge-base-s3-policy-for-${projectName}`, {
        statements: [bedrockKnowledgeBaseS3Policy],
    }),
);  
      
const knowledgeBaseOpenSearchPolicy = new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    resources: ['*'],
    actions: ["aoss:APIAccessAll"],
    });
    knowledge_base_role.attachInlinePolicy( 
    new iam.Policy(this, `bedrock-agent-opensearch-policy-for-${projectName}`, {
        statements: [knowledgeBaseOpenSearchPolicy],
    }),
);  
  
const knowledgeBaseBedrockPolicy = new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    resources: ['*'],
    actions: ["bedrock:*"],
});
    
knowledge_base_role.attachInlinePolicy( 
    new iam.Policy(this, `bedrock-agent-bedrock-policy-for-${projectName}`, {
        statements: [knowledgeBaseBedrockPolicy],
    }),
);  
```

Serverless OpenSearch를 생성합니다. 
```typescript
const collectionName = projectName
const OpenSearchCollection = new opensearchserverless.CfnCollection(this, `opensearch-correction-for-${projectName}`, {
    name: collectionName,    
    description: `opensearch correction for ${projectName}`,
    standbyReplicas: 'DISABLED',
    type: 'VECTORSEARCH',
});
      
const collectionArn = OpenSearchCollection.attrArn
const opensearch_url = OpenSearchCollection.attrCollectionEndpoint
const encPolicyName = `encription-${projectName}`
const encPolicy = new opensearchserverless.CfnSecurityPolicy(this, `opensearch-encription-security-policy`, {
    name: encPolicyName,
    type: "encryption",
    description: `opensearch encryption policy for ${projectName}`,
    policy:
        '{"Rules":[{"ResourceType":"collection","Resource":["collection/*"]}],"AWSOwnedKey":true}',      
});
OpenSearchCollection.addDependency(encPolicy);

const netPolicyName = `network-${projectName}`
const netPolicy = new opensearchserverless.CfnSecurityPolicy(this, `opensearch-network-security-policy`, {
    name: netPolicyName,
    type: 'network',    
    description: `opensearch network policy for ${projectName}`,
    policy: JSON.stringify([
        {
            Rules: [
                {
                    ResourceType: "collection",
                    Resource: ["collection/*"],              
                }
            ],
            AllowFromPublic: true,          
        },
    ]),         
});
OpenSearchCollection.addDependency(netPolicy);

const dataAccessPolicyName = `data-${projectName}`
const dataAccessPolicy = new opensearchserverless.CfnAccessPolicy(this, `opensearch-data-collection-policy-for-${projectName}`, {
    name: dataAccessPolicyName,
    type: "data",
    policy: JSON.stringify([
        {
            Rules: [
              {
                Resource: [`collection/${collectionName}`],
                Permission: [
                  "aoss:CreateCollectionItems",
                  "aoss:DeleteCollectionItems",
                  "aoss:UpdateCollectionItems",
                  "aoss:DescribeCollectionItems",
                ],
                ResourceType: "collection",
              },
              {
                Resource: [`index/${collectionName}/*`],
                Permission: [
                  "aoss:CreateIndex",
                  "aoss:DeleteIndex",
                  "aoss:UpdateIndex",
                  "aoss:DescribeIndex",
                  "aoss:ReadDocument",
                  "aoss:WriteDocument",
                ], 
                ResourceType: "index",
              }
            ],
            Principal: [
              `arn:aws:iam::${accountId}:role/${knowledge_base_role.roleName}`,
              `arn:aws:iam::${accountId}:role/role-lambda-chat-ws-for-${projectName}-${region}`,
              //`arn:aws:iam::${accountId}:role/administration`,
              `arn:aws:sts::${accountId}:assumed-role/administration/ksdyb-Isengard`, 
            ], 
        },
    ]),
});
OpenSearchCollection.addDependency(dataAccessPolicy);
```  

### OpenSearch Index 생성

OpenSearch를 위한 index를 생성합니다. 상세한 내용은 [lambda_function.py](./lambda-chat-ws/lambda_function.py)를 참조합니다. 

생성하려는 vector index의 이름으로 이미 동일한 이름의 index가 있는지 확인합니다.

```python
from opensearchpy import OpenSearch, RequestsHttpConnection, AWSV4SignerAuth

region = os.environ.get('AWS_REGION', 'us-west-2')
service = "aoss"  
credentials = boto3.Session().get_credentials()
awsauth = AWSV4SignerAuth(credentials, region, service)

os_client = OpenSearch(
    hosts = [{
        'host': opensearch_url.replace("https://", ""), 
        'port': 443
    }],
    http_auth=awsauth,
    use_ssl = True,
    verify_certs = True,
    connection_class=RequestsHttpConnection,
)

def is_not_exist(index_name):    
    if os_client.indices.exists(index_name):
        print('use exist index: ', index_name)    
        return False
    else:
        print('no index: ', index_name)
        return True
```

기존에 opensearch index가 없다면 아래와 같이 생성합니다.

```python
if(is_not_exist(vectorIndexName)):
    body={
        'settings':{
            "index.knn": True,
            "index.knn.algo_param.ef_search": 512,
        },
        'mappings': {
            'properties': {
                'vector_field': {
                    'type': 'knn_vector',
                    'dimension': 1024,
                    'method': {
                        "name": "hnsw",
                        "engine": "faiss",
                        "parameters": {
                            "ef_construction": 512,
                            "m": 16
                        }
                    }                  
                },
                "AMAZON_BEDROCK_METADATA": {"type": "text", "index": False},
                "AMAZON_BEDROCK_TEXT_CHUNK": {"type": "text"},
            }
        }
    }
            
    try: # create index
        response = os_client.indices.create(
            vectorIndexName,
            body=body
        )
        print('opensearch index was created:', response)

        # delay 3seconds
        time.sleep(5)
    except Exception:
        err_msg = traceback.format_exc()
        print('error message: ', err_msg)                
```

Knowledge base가 이미 생성되어 있는지 확인하기 위하여 boto3의 [list_knowledge_bases](https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/bedrock-agent/client/list_knowledge_bases.html)으로 현재의 knowledge base의 리스트를 확인합니다. 
            
```python
knowledge_base_name = projectName
try: 
    client = boto3.client('bedrock-agent')         
    response = client.list_knowledge_bases(
        maxResults=10
    )
        
    if "knowledgeBaseSummaries" in response:
        summaries = response["knowledgeBaseSummaries"]
        for summary in summaries:
            if summary["name"] == knowledge_base_name:
                knowledge_base_id = summary["knowledgeBaseId"]
                print('knowledge_base_id: ', knowledge_base_id)
except Exception:
    err_msg = traceback.format_exc()
    print('error message: ', err_msg)
```

### Knowledge Base 생성

OpenSearch index 생성하는 동안에 바로 knowledge base를 생성하게 되면 관련 정보를 가져올 수 있으므로 delay를 두고 재시도 합니다. Knowledge Base의 설정은 [KnowledgeBaseConfiguration](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent_KnowledgeBaseConfiguration.html)을 참조합니다. 여기서 type은 "VECTOR"을 저정하도록 되어 있습니다. 

```python
if not knowledge_base_id:
    print('creating knowledge base...')        
    for atempt in range(3):
        try:
            response = client.create_knowledge_base(
                name=knowledge_base_name,
                description="Knowledge base based on OpenSearch",
                roleArn=knowledge_base_role,
                knowledgeBaseConfiguration={
                    'type': 'VECTOR',
                    'vectorKnowledgeBaseConfiguration': {
                        'embeddingModelArn': embeddingModelArn,
                        'embeddingModelConfiguration': {
                            'bedrockEmbeddingModelConfiguration': {
                                'dimensions': 1024
                            }
                        }
                    }
                },
                storageConfiguration={
                    'type': 'OPENSEARCH_SERVERLESS',
                    'opensearchServerlessConfiguration': {
                        'collectionArn': collectionArn,
                        'fieldMapping': {
                            'metadataField': 'AMAZON_BEDROCK_METADATA',
                            'textField': 'AMAZON_BEDROCK_TEXT_CHUNK',
                            'vectorField': 'vector_field'
                        },
                        'vectorIndexName': vectorIndexName
                    }
                }                
            )   
            print('(create_knowledge_base) response: ', response)
            
            if 'knowledgeBaseId' in response['knowledgeBase']:
                knowledge_base_id = response['knowledgeBase']['knowledgeBaseId']
                break
            else:
                knowledge_base_id = ""    
        except Exception:
                err_msg = traceback.format_exc()
                print('error message: ', err_msg)
                time.sleep(5)
                print(f"retrying... ({atempt})")
```

### 데이터 소스 생성

Amazon S3를 바로보는 data source를 사용하고자 합니다. 먼저 data source가 이미 생성되어 있는지 [list_data_sources](https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/quicksight/client/list_data_sources.html)으로 확인합니다.

```python                
data_source_name = s3_bucket  
try: 
    response = client.list_data_sources(
        knowledgeBaseId=knowledge_base_id,
        maxResults=10
    )        
        
    if 'dataSourceSummaries' in response:
        for data_source in response['dataSourceSummaries']:
            if data_source['name'] == data_source_name:
                data_source_id = data_source['dataSourceId']
                break    
except Exception:
    err_msg = traceback.format_exc()
    print('error message: ', err_msg)
```

새로 data source를 생성합니다.

```python        
if not data_source_id:
    print('creating data source...')  
    try:
        response = client.create_data_source(
            dataDeletionPolicy='DELETE',
            dataSourceConfiguration={
                's3Configuration': {
                    'bucketArn': s3_arn,
                    'inclusionPrefixes': [ 
                        s3_prefix+'/',
                    ]
                },
                'type': 'S3'
            },
            description = f"S3 data source: {s3_bucket}",
            knowledgeBaseId = knowledge_base_id,
            name = data_source_name,
            vectorIngestionConfiguration={
                'chunkingConfiguration': {
                    'chunkingStrategy': 'HIERARCHICAL',
                    'hierarchicalChunkingConfiguration': {
                        'levelConfigurations': [
                            {
                                'maxTokens': 1500
                            },
                            {
                                'maxTokens': 300
                            }
                        ],
                        'overlapTokens': 60
                    }
                },
                'parsingConfiguration': {
                    'bedrockFoundationModelConfiguration': {
                        'modelArn': parsingModelArn
                    },
                    'parsingStrategy': 'BEDROCK_FOUNDATION_MODEL'
                }
            }
        )
        print('(create_data_source) response: ', response)
            
        if 'dataSource' in response:
            if 'dataSourceId' in response['dataSource']:
                data_source_id = response['dataSource']['dataSourceId']
                print('data_source_id: ', data_source_id)
                    
    except Exception:
        err_msg = traceback.format_exc()
        print('error message: ', err_msg)
```            

### 데이터 소스 동기화

Boto3의 [start_ingestion_job](https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/bedrock-agent/client/start_ingestion_job.html)을 이용하여 데이터 동기화를 요청합니다.

여기에서는 사용자가 파일이 올릴때에 동기화를 요청합니다. 대량으로 파일들을 동기화할 경우에는 Amazon S3에 파일을 업로드하고 knowledge base에서 수동으로 동기화를 하거나 event bridge를 이용해 정기적으로 동기화를 수행합니다. 

```python
if knowledge_base_id and data_source_id:
    try:
        client = boto3.client('bedrock-agent')
        response = client.start_ingestion_job(
            knowledgeBaseId=knowledge_base_id,
            dataSourceId=data_source_id
        )
    except Exception:
        err_msg = traceback.format_exc()
        print('error message: ', err_msg)
```


### Knowledge Base에서 관련된 문서 가져오기

Knowledbe base에서 관련된 문서를 조회하기 위해서 [AmazonKnowledgeBasesRetriever](https://python.langchain.com/v0.2/api_reference/aws/retrievers/langchain_aws.retrievers.bedrock.AmazonKnowledgeBasesRetriever.html)을 이용합니다.

```python
from langchain_aws import AmazonKnowledgeBasesRetriever

knowledge_base_id = None
knowledge_base_name = projectName 
def retrieve_from_knowledge_base(query):
    global knowledge_base_id
    if not knowledge_base_id:        
        client = boto3.client('bedrock-agent')         
        response = client.list_knowledge_bases(
            maxResults=10
        )
        print('response: ', response)
                
        if "knowledgeBaseSummaries" in response:
            summaries = response["knowledgeBaseSummaries"]
            for summary in summaries:
                if summary["name"] == knowledge_base_name:
                    knowledge_base_id = summary["knowledgeBaseId"]
                    print('knowledge_base_id: ', knowledge_base_id)
                    break
    
    relevant_docs = []
    if knowledge_base_id:    
        retriever = AmazonKnowledgeBasesRetriever(
            knowledge_base_id=knowledge_base_id, 
            retrieval_config={"vectorSearchConfiguration": {"numberOfResults": 2}},
        )
        
        relevant_docs = retriever.invoke(query)
        print(relevant_docs)
    
    docs = []
    for i, document in enumerate(relevant_docs):
        #print(f"{i}: {document.page_content}")
        print_doc(i, document)
        if document.page_content:
            excerpt = document.page_content
        
        score = document.metadata["score"]
        # print('score:', score)
        doc_prefix = "knowledge-base"
        
        link = ""
        if "s3Location" in document.metadata["location"]:
            link = document.metadata["location"]["s3Location"]["uri"] if document.metadata["location"]["s3Location"]["uri"] is not None else ""
            
            pos = link.find(f"/{doc_prefix}")
            name = link[pos+len(doc_prefix)+1:]
            encoded_name = parse.quote(name)
            link = f"{path}{doc_prefix}{encoded_name}"
            
        elif "webLocation" in document.metadata["location"]:
            link = document.metadata["location"]["webLocation"]["url"] if document.metadata["location"]["webLocation"]["url"] is not None else ""
            name = "Web Crawler"

        docs.append(
            Document(
                page_content=excerpt,
                metadata={
                    'name': name,
                    'url': link,
                    'from': 'RAG'
                },
            )
        )
    return docs
```

### Knowlodge Base 조회하는 기능을 Tool로 등록하기

Knowledge Base를 조회하는 함수를 Tool로 등록하여 agent에서 tool use 패턴으로 활용합니다. 이를 위해 아래와 같이 tool로 등록할때 검색조건을 "Search technical information by keyword"로 설정합니다. 이때, numberOfResults 수만큼 검색합니다.

```python
@tool    
def search_by_knowledge_base(keyword: str) -> str:
    """
    Search technical information by keyword and then return the result as a string.
    keyword: search keyword
    return: the technical information of keyword
    """    
    print("###### search_by_knowledge_base ######")
    
    top_k = 4
    relevant_docs = []
    if knowledge_base_id:    
        retriever = AmazonKnowledgeBasesRetriever(
            knowledge_base_id=knowledge_base_id, 
            retrieval_config={"vectorSearchConfiguration": {
                "numberOfResults": top_k,
                "overrideSearchType": "HYBRID"   # SEMANTIC
            }},
        )        
        relevant_docs = retriever.invoke(keyword)
        
    filtered_docs = grade_documents(keyword, relevant_docs)
    filtered_docs = check_duplication(filtered_docs)  # duplication checker
            
    relevant_context = ""
    for i, document in enumerate(filtered_docs):
        if document.page_content:
            content = document.page_content            
        relevant_context = relevant_context + content + "\n\n"        
    
    return relevant_context
```

### Agentic Workflow의 구현

여기에서는 agectic workflow의 tool use 패턴을 이용하여 knowledge base로 구성한 RAG의 정보를 조회하여 활용합니다. 아래와 같이 Workflow를 정의합니다.

```python
class State(TypedDict):
    messages: Annotated[list, add_messages]

workflow = StateGraph(State)

workflow.add_node("agent", call_model)
workflow.add_node("action", tool_node)
workflow.add_edge(START, "agent")
workflow.add_conditional_edges(
    "agent",
    should_continue,
    {
        "continue": "action",
        "end": END,
    },
)
workflow.add_edge("action", "agent")

app = workflow.compile()
```

아래와 같이 실행합니다. 

```python
inputs = [HumanMessage(content=query)]
config = {
    "recursion_limit": 50,
    "requestId": requestId,
    "connectionId": connectionId
}

for event in app.stream({"messages": inputs}, config, stream_mode="values"):   
    message = event["messages"][-1]
```

또한, search_by_knowledge_base을 포함한 tool들을 노드로 등록합니다.

```python
tools = [get_current_time, get_book_list, get_weather_info, search_by_tavily, search_by_knowledge_base]

chatModel = get_chat()
model = chatModel.bind_tools(tools)

tool_node = ToolNode(tools)
```

이때의 agent의 call_model은 아래와 같습니다.

```python
def call_model(state: State, config):
    update_state_message("thinking...", config)
    
    if isKorean(state["messages"][0].content)==True:
        system = (
            "질문에 친근한 방식으로 대답하도록 설계된 대화형 AI입니다."
            "상황에 맞는 구체적인 세부 정보를 충분히 제공합니다."
            "모르는 질문을 받으면 솔직히 모른다고 말합니다."
        )
    else: 
        system = (            
            "You are a conversational AI designed to answer in a friendly way to a question."
            "If you don't know the answer, just say that you don't know, don't try to make up an answer."
            "You will be acting as a thoughtful advisor."    
        )
        
    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", system),
            MessagesPlaceholder(variable_name="messages"),
        ]
    )
    chain = prompt | model
        
    response = chain.invoke(state["messages"])    
    return {"messages": [response]}
```

또한, workflow의 condtional edge는 아래와 같이 정의합니다.

```python
def should_continue(state: State) -> Literal["continue", "end"]:
    messages = state["messages"]    
    
    last_message = messages[-1]            
    if not last_message.tool_calls:
        next = "end"
    else:           
        next = "continue"         
    return next
```


### 참고문헌 가져오기

참고문헌은 document의 metafile에서 추출하여 아래와 같이 활용합니다. 

```python
def get_reference_of_knoweledge_base(docs, path, doc_prefix):
    reference = "\n\nFrom\n"
    #print('path: ', path)
    #print('doc_prefix: ', doc_prefix)
    #print('prefix: ', f"/{doc_prefix}")
    
    for i, document in enumerate(docs):
        if document.page_content:
            excerpt = document.page_content
        
        score = document.metadata["score"]
        print('score:', score)
        doc_prefix = "knowledge-base"
        
        link = ""
        if "s3Location" in document.metadata["location"]:
            link = document.metadata["location"]["s3Location"]["uri"] if document.metadata["location"]["s3Location"]["uri"] is not None else ""
            
            print('link:', link)    
            pos = link.find(f"/{doc_prefix}")
            name = link[pos+len(doc_prefix)+1:]
            encoded_name = parse.quote(name)
            print('name:', name)
            link = f"{path}{doc_prefix}{encoded_name}"
            
        elif "webLocation" in document.metadata["location"]:
            link = document.metadata["location"]["webLocation"]["url"] if document.metadata["location"]["webLocation"]["url"] is not None else ""
            name = "WWW"

        print('link:', link)
                    
        reference = reference + f"{i+1}. <a href={link} target=_blank>{name}</a>, <a href=\"#\" onClick=\"alert(`{excerpt}`)\">관련문서</a>\n"
                    
    return reference
```

### LLM으로 RAG Grading 활용하기

LLM의 관련된 문서의 숫자와 길이가 적다면 문서의 순서가 크게 영향을 주지 않습니다. 여기에서는 LLM으로 간단히 grading함으로써 RAG의 성능을 향상시키는 방법을 사용하고 있습니다. [LLM으로 RAG Grading 활용하기](https://github.com/kyopark2014/korean-chatbot-using-amazon-bedrock/blob/main/RAG-grading.md)에서는 prompt와 structured output을 이용하는 방법을 설명합니다.

## 직접 실습 해보기

### 사전 준비 사항

이 솔루션을 사용하기 위해서는 사전에 아래와 같은 준비가 되어야 합니다.

- [AWS Account 생성](https://repost.aws/ko/knowledge-center/create-and-activate-aws-account)에 따라 계정을 준비합니다.

### CDK를 이용한 인프라 설치

본 실습에서는 us-west-2 리전을 사용합니다. [인프라 설치](./deployment.md)에 따라 CDK로 인프라 설치를 진행합니다. 

## 실행결과

채팅 메뉴에서 "RAG Knowledge Base"를 선택한 후에 "교보 다이렉트 보험에 대해 설명해주세요."라고 입력하면 아래와 같이 RAG를 통해 얻어진 정보와 관련 문서를 확인할 수 있습니다.

![image](https://github.com/user-attachments/assets/ff287438-ca1d-4d52-a718-c1c67dac597f)


## 결론

Knowledge Base를 활용하여 RAG를 적용할 때에 데이터의 등록 및 삭제를 편리하게 할 수 있습니다. 여기에서는 knowledge base의 지식 저장소로 Serverless OpenSearch를 사용하고 있어서 인프라의 관리에 대한 노력을 줄이면서도 충분한 RAG 성능을 확보할 수 있습니다. 인프라를 효율적으로 관리하기 위하여 AWS CDK로 OpenSearch를 설치하고 index와 data source를 python code로 관리하는 방법을 설명하였습니다. 


## 리소스 정리하기 

더이상 인프라를 사용하지 않는 경우에 아래처럼 모든 리소스를 삭제할 수 있습니다. 

1) [API Gateway Console](https://us-west-2.console.aws.amazon.com/apigateway/main/apis?region=us-west-2)로 접속하여 "api-chatbot-for-managed-rag-chatbot", "api-managed-rag-chatbot"을 삭제합니다.

2) [Cloud9 Console](https://us-west-2.console.aws.amazon.com/cloud9control/home?region=us-west-2#/)에 접속하여 아래의 명령어로 전체 삭제를 합니다.

```text
cd ~/environment/managed-rag/cdk-managed-rag/ && cdk destroy --all
```
