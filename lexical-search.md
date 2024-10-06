# Lexical Search

OpenSearch는 Vector/Lexical Search를 모두 지원합니다.

아래와 같이 OpenSearch에서 index 생성시에 Nori를 설정하였으나, Knowledge Base에서 OpenSearch에서 등록이 되지 않는것으로 보여집니다. 

```python
if(is_not_exist(vectorIndexName)):
    body={
        'settings':{
            "index.knn": True,
            "index.knn.algo_param.ef_search": 512,
            'analysis': {
                'analyzer': {
                    'my_analyzer': {
                        'char_filter': ['html_strip'], 
                        'tokenizer': 'nori',
                        'filter': ['nori_number','lowercase','trim','my_nori_part_of_speech'],
                        'type': 'custom'
                    }
                },
                'tokenizer': {
                    'nori': {
                        'decompound_mode': 'mixed',
                        'discard_punctuation': 'true',
                        'type': 'nori_tokenizer'
                    }
                },
                "filter": {
                    "my_nori_part_of_speech": {
                        "type": "nori_part_of_speech",
                        "stoptags": [
                                "E", "IC", "J", "MAG", "MAJ",
                                "MM", "SP", "SSC", "SSO", "SC",
                                "SE", "XPN", "XSA", "XSN", "XSV",
                                "UNA", "NA", "VSV"
                        ]
                    }
                }
            },
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
```

Lexical search는 아래와 같이 수행하였습니다. 

```python
def lexical_search(query, top_k):
    # lexical search (keyword)
    min_match = 0
    
    query = {
        "query": {
            "bool": {
                "must": [
                    {
                        "match": {
                            "text": {
                                "query": query,
                                "minimum_should_match": f'{min_match}%',
                                "operator":  "or",
                            }
                        }
                    },
                ],
                "filter": [
                ]
            }
        }
    }

    response = os_client.search(
        body=query,
        index=vectorIndexName   # "idx-*"  (all)
    )
    print('lexical query result: ', json.dumps(response))
        
    docs = []
    for i, document in enumerate(response['hits']['hits']):
        #print(f"{i}: {document['_source']['text']}")
        print(f"{i}: {document}")
```

이때의 결과는 아래와 같이 empty입니다.

```java
lexical query result:  
{
    "took": 7,
    "timed_out": false,
    "_shards": {
        "total": 0,
        "successful": 0,
        "skipped": 0,
        "failed": 0
    },
    "hits": {
        "total": {
            "value": 0,
            "relation": "eq"
        },
        "max_score": null,
        "hits": []
    }
}
```

따라서, 별로도 OpenSearch에 입력하여야만 keyword 검색이 가능합니다.
