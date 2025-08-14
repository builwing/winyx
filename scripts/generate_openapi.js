#!/usr/bin/env node

/**
 * Go-Zero API契約ファイルからOpenAPI 3.0仕様書を生成するスクリプト
 * 使用法: node generate_openapi.js
 */

const fs = require('fs');
const path = require('path');

// 設定
const CONFIG = {
  apiFiles: [
    path.join(__dirname, '../backend/test_api/test_api.api'),
  ],
  outputFile: path.join(__dirname, '../docs/swagger.json'),
  swaggerUIDir: path.join(__dirname, '../docs/swagger-ui'),
  apiInfo: {
    title: "Winyx API",
    description: "Winyx プロジェクトのAPI仕様書",
    version: "1.0.0",
    contact: {
      name: "Winyx Team",
      email: "team@winyx.jp"
    },
    license: {
      name: "MIT",
      url: "https://opensource.org/licenses/MIT"
    }
  },
  servers: [
    {
      url: "https://winyx.jp",
      description: "本番環境"
    },
    {
      url: "http://localhost:8888",
      description: "開発環境"
    }
  ]
};

/**
 * Go型からOpenAPIスキーマ型に変換
 */
function convertToOpenAPIType(goType) {
  const typeMapping = {
    'string': { type: 'string' },
    'int': { type: 'integer', format: 'int32' },
    'int32': { type: 'integer', format: 'int32' },
    'int64': { type: 'integer', format: 'int64' },
    'float32': { type: 'number', format: 'float' },
    'float64': { type: 'number', format: 'double' },
    'bool': { type: 'boolean' },
    'time.Time': { type: 'string', format: 'date-time' },
    'interface{}': { type: 'object' }
  };

  // 配列型の処理
  if (goType.startsWith('[]')) {
    const innerType = goType.slice(2);
    return {
      type: 'array',
      items: convertToOpenAPIType(innerType)
    };
  }

  // ポインタ型の処理
  if (goType.startsWith('*')) {
    return convertToOpenAPIType(goType.slice(1));
  }

  // 基本型のマッピング
  if (typeMapping[goType]) {
    return typeMapping[goType];
  }

  // カスタム型（参照として扱う）
  return {
    $ref: `#/components/schemas/${goType}`
  };
}

/**
 * Go-Zero APIファイルを解析してOpenAPI仕様に変換
 */
function parseApiToOpenAPI(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  const schemas = {};
  const paths = {};
  const tags = new Set();
  let currentType = null;
  let inService = false;
  let serviceGroup = '';
  let servicePrefix = '';
  let jwtAuth = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // 型定義の解析
    if (line.startsWith('type ') && line.includes('{')) {
      const typeName = line.match(/type\s+(\w+)/)?.[1];
      if (typeName) {
        currentType = {
          name: typeName,
          properties: {},
          required: [],
          description: extractComment(lines, i - 1)
        };
      }
    }
    
    // 型のフィールド解析
    else if (currentType && line.includes('`json:')) {
      const fieldMatch = line.match(/(\w+)\s+(.+?)\s+`json:"(.+?)"`/);
      if (fieldMatch) {
        const [, fieldName, fieldType, jsonName] = fieldMatch;
        const isOptional = fieldType.includes('*') || fieldType.includes('?');
        
        currentType.properties[jsonName] = {
          ...convertToOpenAPIType(fieldType),
          description: extractInlineComment(line)
        };
        
        if (!isOptional) {
          currentType.required.push(jsonName);
        }
      }
    }
    
    // 型定義の終了
    else if (currentType && line === '}') {
      schemas[currentType.name] = {
        type: 'object',
        properties: currentType.properties,
        required: currentType.required.length > 0 ? currentType.required : undefined,
        description: currentType.description
      };
      currentType = null;
    }
    
    // サービス設定の解析
    else if (line.includes('@server(')) {
      const serverConfig = extractServerConfig(lines, i);
      serviceGroup = serverConfig.group || '';
      servicePrefix = serverConfig.prefix || '';
      jwtAuth = !!serverConfig.jwt;
    }
    
    // サービス定義の開始
    else if (line.startsWith('service ')) {
      inService = true;
    }
    
    // エンドポイント定義の解析
    else if (inService && line.includes('@handler')) {
      const handlerName = line.match(/@handler\s+(\w+)/)?.[1];
      const nextLine = lines[i + 1]?.trim();
      
      if (nextLine && handlerName) {
        const endpoint = parseEndpointToOpenAPI(nextLine, handlerName, serviceGroup, servicePrefix, jwtAuth);
        if (endpoint) {
          const fullPath = endpoint.path;
          if (!paths[fullPath]) {
            paths[fullPath] = {};
          }
          paths[fullPath][endpoint.method] = endpoint.spec;
          
          if (serviceGroup) {
            tags.add(serviceGroup);
          }
        }
      }
    }
    
    // サービス定義の終了
    else if (inService && line === '}') {
      inService = false;
      serviceGroup = '';
      servicePrefix = '';
      jwtAuth = false;
    }
  }
  
  return { schemas, paths, tags: Array.from(tags) };
}

/**
 * エンドポイントをOpenAPI形式に変換
 */
function parseEndpointToOpenAPI(line, handlerName, group, prefix, requiresAuth) {
  const match = line.match(/(\w+)\s+(.+?)(?:\s+\((.+?)\))?(?:\s+returns\s+\((.+?)\))?/);
  if (!match) return null;
  
  const [, method, path, requestType, responseType] = match;
  const fullPath = (prefix || '') + path;
  
  // パスパラメータの検出と変換
  const openApiPath = fullPath.replace(/:(\w+)/g, '{$1}');
  
  const spec = {
    tags: group ? [group] : ['default'],
    summary: `${handlerName} endpoint`,
    description: `${handlerName}の詳細説明`,
    operationId: handlerName,
    parameters: [],
    responses: {
      '200': {
        description: 'Success',
      },
      '400': {
        description: 'Bad Request',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        }
      },
      '500': {
        description: 'Internal Server Error',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                error: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        }
      }
    }
  };
  
  // 認証が必要な場合
  if (requiresAuth) {
    spec.security = [{ bearerAuth: [] }];
    spec.responses['401'] = {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' }
            }
          }
        }
      }
    };
  }
  
  // パスパラメータの追加
  const pathParams = openApiPath.match(/\{(\w+)\}/g);
  if (pathParams) {
    pathParams.forEach(param => {
      const paramName = param.slice(1, -1);
      spec.parameters.push({
        name: paramName,
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: `${paramName}パラメータ`
      });
    });
  }
  
  // リクエストボディの追加
  if (requestType && requestType !== 'void') {
    spec.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: {
            $ref: `#/components/schemas/${requestType}`
          }
        }
      }
    };
  }
  
  // レスポンスの追加
  if (responseType && responseType !== 'void') {
    spec.responses['200'].content = {
      'application/json': {
        schema: {
          $ref: `#/components/schemas/${responseType}`
        }
      }
    };
  }
  
  return {
    path: openApiPath,
    method: method.toLowerCase(),
    spec
  };
}

/**
 * サーバー設定を抽出
 */
function extractServerConfig(lines, startIndex) {
  const config = {};
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === ')') break;
    
    const jwtMatch = line.match(/jwt:\s*(\w+)/);
    const groupMatch = line.match(/group:\s*(\w+)/);
    const prefixMatch = line.match(/prefix:\s*(.+)/);
    
    if (jwtMatch) config.jwt = jwtMatch[1];
    if (groupMatch) config.group = groupMatch[1];
    if (prefixMatch) config.prefix = prefixMatch[1];
  }
  return config;
}

/**
 * コメントを抽出
 */
function extractComment(lines, index) {
  if (index >= 0 && lines[index].trim().startsWith('//')) {
    return lines[index].trim().slice(2).trim();
  }
  return '';
}

/**
 * インラインコメントを抽出
 */
function extractInlineComment(line) {
  const commentMatch = line.match(/\/\/\s*(.+)$/);
  return commentMatch ? commentMatch[1].trim() : '';
}

/**
 * OpenAPI仕様書を生成
 */
function generateOpenAPISpec() {
  console.log('🚀 OpenAPI仕様書を生成中...');
  
  let allSchemas = {};
  let allPaths = {};
  let allTags = new Set();
  
  // 各APIファイルを処理
  CONFIG.apiFiles.forEach(apiFile => {
    if (fs.existsSync(apiFile)) {
      console.log(`📄 解析中: ${path.basename(apiFile)}`);
      const { schemas, paths, tags } = parseApiToOpenAPI(apiFile);
      
      Object.assign(allSchemas, schemas);
      Object.assign(allPaths, paths);
      tags.forEach(tag => allTags.add(tag));
    } else {
      console.warn(`⚠️  ファイルが見つかりません: ${apiFile}`);
    }
  });
  
  // OpenAPI仕様書の構築
  const openApiSpec = {
    openapi: '3.0.3',
    info: CONFIG.apiInfo,
    servers: CONFIG.servers,
    tags: Array.from(allTags).map(tag => ({
      name: tag,
      description: `${tag} related endpoints`
    })),
    paths: allPaths,
    components: {
      schemas: allSchemas,
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT認証トークン'
        }
      }
    }
  };
  
  return openApiSpec;
}

/**
 * Swagger UIのindex.htmlを更新
 */
function updateSwaggerUI() {
  const indexPath = path.join(CONFIG.swaggerUIDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.warn('⚠️  Swagger UIが見つかりません。スキップします。');
    return;
  }
  
  let indexContent = fs.readFileSync(indexPath, 'utf8');
  
  // swagger.jsonへのパスを更新
  indexContent = indexContent.replace(
    /url:\s*["'].*?["']/,
    `url: '../swagger.json'`
  );
  
  fs.writeFileSync(indexPath, indexContent);
  console.log('✅ Swagger UIを更新しました');
}

/**
 * メイン実行関数
 */
function main() {
  try {
    // OpenAPI仕様書を生成
    const openApiSpec = generateOpenAPISpec();
    
    // JSONファイルとして保存
    fs.writeFileSync(CONFIG.outputFile, JSON.stringify(openApiSpec, null, 2));
    console.log(`✅ OpenAPI仕様書を生成: ${CONFIG.outputFile}`);
    
    // Swagger UIを更新
    updateSwaggerUI();
    
    // 統計情報を表示
    const schemaCount = Object.keys(openApiSpec.components.schemas).length;
    const pathCount = Object.keys(openApiSpec.paths).length;
    const endpointCount = Object.values(openApiSpec.paths)
      .reduce((sum, path) => sum + Object.keys(path).length, 0);
    
    console.log('\n📊 生成統計:');
    console.log(`   スキーマ: ${schemaCount}個`);
    console.log(`   パス: ${pathCount}個`);
    console.log(`   エンドポイント: ${endpointCount}個`);
    
    console.log('\n🎉 OpenAPI仕様書の生成が完了しました！');
    console.log(`📖 Swagger UI: http://localhost:8888/docs/swagger-ui/`);
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// スクリプトが直接実行された場合にメイン関数を実行
if (require.main === module) {
  main();
}

module.exports = { parseApiToOpenAPI, generateOpenAPISpec };