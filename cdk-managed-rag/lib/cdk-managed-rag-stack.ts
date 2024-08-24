import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as path from "path";
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudFront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as apiGateway from 'aws-cdk-lib/aws-apigateway';
import * as s3Deploy from "aws-cdk-lib/aws-s3-deployment";
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as opensearch from 'aws-cdk-lib/aws-opensearchservice';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as kendra from 'aws-cdk-lib/aws-kendra';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import * as opensearchserverless from 'aws-cdk-lib/aws-opensearchserverless';
import { aws_bedrock as bedrock } from 'aws-cdk-lib';

const region = process.env.CDK_DEFAULT_REGION;    
const accountId = process.env.CDK_DEFAULT_ACCOUNT;
const debug = false;
const stage = 'dev';
const s3_prefix = 'docs';
const projectName = `managed-rag-chatbot`; 
const bucketName = `storage-for-${projectName}-${accountId}-${region}`; 
let kendra_region = process.env.CDK_DEFAULT_REGION;   //  "us-west-2"
const rag_method = 'RetrievalPrompt'; // RetrievalPrompt, RetrievalQA, ConversationalRetrievalChain

const opensearch_account = "admin";
const opensearch_passwd = "Wifi1234!";
const enableReference = 'true';
let opensearch_url = "";
const debugMessageMode = 'false'; // if true, debug messages will be delivered to the client.
const useParallelRAG = 'true';
const numberOfRelevantDocs = '6';
const kendraMethod = "custom_retriever"; // custom_retriever or kendra_retriever
const allowDualSearch = 'false';
const capabilities = JSON.stringify(["kendra", "opensearch"]); 
const supportedFormat = JSON.stringify(["pdf", "txt", "csv", "pptx", "ppt", "docx", "doc", "xlsx", "py", "js", "md", 'png', 'jpeg', 'jpg']);  
const separated_chat_history = 'true';

const max_object_size = 102400000; // 100 MB max size of an object, 50MB(default)
const enableHybridSearch = 'true';
const enableParallelSummary = 'true';
const enalbeParentDocumentRetrival = 'true';
const speech_generation = 'false';

const claude3_5_sonnet = [
  {
    "bedrock_region": "us-west-2", // Oregon
    "model_type": "claude3.5",
    "max_tokens": 4096,
    "model_id": "anthropic.claude-3-5-sonnet-20240620-v1:0"
  },
  {
    "bedrock_region": "us-east-1", // N.Virginia
    "model_type": "claude3.5",
    "max_tokens": 4096,
    "model_id": "anthropic.claude-3-5-sonnet-20240620-v1:0"
  },
  {
    "bedrock_region": "eu-central-1", // Frankfurt
    "model_type": "claude3.5",
    "max_tokens": 4096,
    "model_id": "anthropic.claude-3-5-sonnet-20240620-v1:0"
  },
  {
    "bedrock_region": "ap-northeast-1", // Tokyo
    "model_type": "claude3.5",
    "max_tokens": 4096,
    "model_id": "anthropic.claude-3-5-sonnet-20240620-v1:0"
  }
];

const claude3_sonnet = [
  {
    "bedrock_region": "us-west-2", // Oregon
    "model_type": "claude3",
    "model_id": "anthropic.claude-3-sonnet-20240229-v1:0"
  },
  {
    "bedrock_region": "us-east-1", // N.Virginia
    "model_type": "claude3",
    "model_id": "anthropic.claude-3-sonnet-20240229-v1:0"
  },
  {
    "bedrock_region": "ca-central-1", // Canada
    "model_type": "claude3",
    "model_id": "anthropic.claude-3-sonnet-20240229-v1:0"
  },
  {
    "bedrock_region": "eu-west-2", // London
    "model_type": "claude3",
    "model_id": "anthropic.claude-3-sonnet-20240229-v1:0"
  },
  {
    "bedrock_region": "sa-east-1", // Sao Paulo
    "model_type": "claude3",
    "model_id": "anthropic.claude-3-sonnet-20240229-v1:0"
  }
];

const claude3_haiku = [
  {
    "bedrock_region": "us-west-2", // Oregon
    "model_type": "claude3",
    "model_id": "anthropic.claude-3-haiku-20240307-v1:0"
  },
  {
    "bedrock_region": "us-east-1", // N.Virginia
    "model_type": "claude3",
    "model_id": "anthropic.claude-3-haiku-20240307-v1:0"
  },
  {
    "bedrock_region": "ca-central-1", // Canada
    "model_type": "claude3",
    "model_id": "anthropic.claude-3-haiku-20240307-v1:0"
  },
  {
    "bedrock_region": "eu-west-2", // London
    "model_type": "claude3",
    "model_id": "anthropic.claude-3-haiku-20240307-v1:0"
  },
  {
    "bedrock_region": "sa-east-1", // Sao Paulo
    "model_type": "claude3",
    "model_id": "anthropic.claude-3-haiku-20240307-v1:0"
  }
];

const titan_embedding_v1 = [  // dimension = 1536
  {
    "bedrock_region": "us-west-2", // Oregon
    "model_type": "titan",
    "model_id": "amazon.titan-embed-text-v1"
  },
  {
    "bedrock_region": "us-east-1", // N.Virginia
    "model_type": "titan",
    "model_id": "amazon.titan-embed-text-v1"
  }
];

const titan_embedding_v2 = [  // dimension = 1024
  {
    "bedrock_region": "us-west-2", // Oregon
    "model_type": "titan",
    "model_id": "amazon.titan-embed-text-v2:0"
  },
  {
    "bedrock_region": "us-east-1", // N.Virginia
    "model_type": "titan",
    "model_id": "amazon.titan-embed-text-v2:0"
  },
  {
    "bedrock_region": "ca-central-1", // Canada
    "model_type": "titan",
    "model_id": "amazon.titan-embed-text-v2:0"
  },
  {
    "bedrock_region": "eu-west-2", // London
    "model_type": "titan",
    "model_id": "amazon.titan-embed-text-v2:0"
  },
  {
    "bedrock_region": "sa-east-1", // Sao Paulo
    "model_type": "titan",
    "model_id": "amazon.titan-embed-text-v2:0"
  }
];

const LLM_for_chat = claude3_sonnet;
const LLM_for_multimodal = claude3_sonnet;
const LLM_embedding = titan_embedding_v2;
const vectorIndexName = "idx-rag"

export class CdkManagedRagStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Knowledge Base Role
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
      policy:
        '{"Rules":[{"ResourceType":"collection","Resource":["collection/*"]}],"AWSOwnedKey":true}',      
    });
    OpenSearchCollection.addDependency(encPolicy);

    const netPolicy = new opensearchserverless.CfnSecurityPolicy(this, `opensearch-network-security-policy`, {
      name: `network-policy`,
      type: 'network',    
      description: `opensearch security policy for ${projectName}`,
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
    
        // the properties below are optional
        opensearchServerlessConfiguration: {
          collectionArn: OpenSearchCollection.attrArn,
          vectorIndexName: vectorIndexName,
          fieldMapping: {            
            textField: 'text',
            vectorField: 'vector_field',
            metadataField: 'metadata',
          },          
        },
      },          
    }); 

    














  }
}
