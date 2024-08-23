# CDK로 Agent 등록하기

아래 코드는 아직 테스트 전입니다.

```java
    const bedrock_agent_role = new iam.Role(this,  `role-bedrock-execution-agent-for-${projectName}`, {
      roleName: `role-bedrock-execution-agent-for-${projectName}-${region}`,
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal("bedrock.amazonaws.com")
      )
    });

    const bedrockAgentInvokePolicy = new iam.PolicyStatement({ 
      effect: iam.Effect.ALLOW,
      resources: [`arn:aws:bedrock:${region}::foundation-model/anthropic.claude-3-haiku-20240307-v1:0`],
      // resources: ['*'],
      actions: [
        "bedrock:InvokeModel", 
        "bedrock:InvokeModelEndpoint", 
        "bedrock:InvokeModelEndpointAsync"
      ],
    });        
    bedrock_agent_role.attachInlinePolicy( 
      new iam.Policy(this, `bedrock-invoke-policy-for-${projectName}`, {
        statements: [bedrockAgentInvokePolicy],
      }),
    );  

    const bedrockAgentS3Policy = new iam.PolicyStatement({
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
    bedrock_agent_role.attachInlinePolicy( 
      new iam.Policy(this, `bedrock-agent-s3-policy-for-${projectName}`, {
        statements: [bedrockAgentS3Policy],
      }),
    );  

    const bedrockAgentOpenSearchPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: ['*'],
      actions: ["aoss:APIAccessAll"],
    });
    bedrock_agent_role.attachInlinePolicy( 
      new iam.Policy(this, `bedrock-agent-opensearch-policy-for-${projectName}`, {
        statements: [bedrockAgentOpenSearchPolicy],
      }),
    );  

    const bedrock_agent = new bedrock.CfnAgentAlias(this, `bedrock-agent-alias-for-${projectName}`, {
      agentAliasName: `agent-alias-bedrock-for-${projectName}`,
      agentId: 'bedrock-agentId',
      description: 'bedrock ageent'
    });

    const agent_alias_string = bedrock_agent.ref;
    const agent_alias = agent_alias_string.split("|")[-1]

    new cdk.CfnOutput(this, `bedrock-agent-alias-for-${projectName}`, {
      value: agent_alias,
      description: 'bedrock agent alias',
```

## Reference

[On AWS CDK and Amazon Bedrock Knowledge bases](https://medium.com/@micheldirk/on-aws-cdk-and-amazon-bedrock-knowledge-bases-14c7b208e4cb)


