# OpenSearch Serverless

![image](https://github.com/user-attachments/assets/f451e5cd-eaf0-45de-bc62-09089506e4e6)


이때 사용한 CDK 코드는 아래와 같습니다.

```java
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
      // resources: ['*'],
      actions: [
        "bedrock:InvokeModel", 
        "bedrock:InvokeModelEndpoint", 
        "bedrock:InvokeModelEndpointAsync"
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

    // OpenSearch Serverless
    const collectionName = projectName
    const OpenSearchCollection = new opensearchserverless.CfnCollection(this, `opensearch-correction-for-${projectName}`, {
      name: collectionName,    
      description: `opensearch correction for ${projectName}`,
      standbyReplicas: 'DISABLED',
      type: 'VECTORSEARCH',
    });

    const encPolicy = new opensearchserverless.CfnSecurityPolicy(this, `opensearch-encription-security-policy`, {
      name: `encription-policy`,
      type: "encryption",
      description: `opensearch encryption policy for ${projectName}`,
      policy:
        '{"Rules":[{"ResourceType":"collection","Resource":["collection/*"]}],"AWSOwnedKey":true}',      
    });
    OpenSearchCollection.addDependency(encPolicy);

    const netPolicy = new opensearchserverless.CfnSecurityPolicy(this, `opensearch-network-security-policy`, {
      name: `network-policy`,
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

    const dataAccessPolicy = new opensearchserverless.CfnAccessPolicy(this, `opensearch-data-collection-policy-for-${projectName}`, {
      name: `data-collection-policy`,
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
          //  knowledge_base_role.roleArn,
            `arn:aws:iam::${accountId}:role/${knowledge_base_role.roleName}`,
            //props.executorRole.roleArn,
            `arn:aws:iam::${accountId}:role/administration`,            
          ], 
        },
      ]),
    });
    OpenSearchCollection.addDependency(dataAccessPolicy);



    const cfnKnowledgeBase = new bedrock.CfnKnowledgeBase(this, `knowledge-base-for-${projectName}`, {
      name: `knowledge-base-for-${projectName}`,
      description: `knowledge base for ${projectName}`,
      roleArn: knowledge_base_role.roleArn,
      knowledgeBaseConfiguration: {
        type: 'VECTOR',
        
        vectorKnowledgeBaseConfiguration: {
          embeddingModelArn: `arn:aws:bedrock:${region}::foundation-model/amazon.titan-embed-text-v2:0`,    
          embeddingModelConfiguration: {
            bedrockEmbeddingModelConfiguration: {
              dimensions: 1024,
            },
          },
        },
      },
      
      storageConfiguration: {
        type: 'OPENSEARCH_SERVERLESS',
    
        opensearchServerlessConfiguration: {
          collectionArn: OpenSearchCollection.attrArn,
          vectorIndexName: vectorIndexName,
          fieldMapping: {            
            textField: 'AMAZON_BEDROCK_TEXT_CHUNK',
            vectorField: 'bedrock-knowledge-base-default-vector',
            metadataField: 'AMAZON_BEDROCK_METADATA',
          },          
        },
      },          
    });
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
