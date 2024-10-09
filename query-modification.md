# Query modification 

Knowledge base에서 Query modification 설정은 아래와 같습니다.

[Configure and customize queries and response generation](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-test-config.html)

```java
POST /retrieveAndGenerate HTTP/1.1
Content-type: application/json
{
   "input": {
      "text": "string"
   },
   "retrieveAndGenerateConfiguration": {
      "knowledgeBaseConfiguration": {
         "orchestrationConfiguration": { // Query decomposition
           "queryTransformationConfiguration": {
                "type": "string" // enum of QUERY_DECOMPOSITION
           }
         },
...}
}
```
