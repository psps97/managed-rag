# RAG의 filter 이용

Knowledge base에서 filter를 이용해 검색 범위를 조정할 수 있습니다. 상세한 내용은 [RetrievalFilter](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_RetrievalFilter.html)을 참조합니다.

이때의 요청 포맷은 [retrieve](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_Retrieve.html#API_agent-runtime_Retrieve_RequestSyntax)을 참조합니다.

```java
POST /knowledgebases/knowledgeBaseId/retrieve HTTP/1.1
Content-type: application/json

{
   "nextToken": "string",
   "retrievalConfiguration": { 
      "vectorSearchConfiguration": { 
         "filter": { ... },
         "numberOfResults": number,
         "overrideSearchType": "string"
      }
   },
   "retrievalQuery": { 
      "text": "string"
   }
}
```

filter의 예는 아래와 같습니다.

```java
"equals": { "key": "animal", "value": "cat" }
```

```java
"greaterThan": { "key": "year", "value": 1989 }
```

```java
"in": { "key": "animal", "value": ["cat", "dog"] }
```
