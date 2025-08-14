#!/usr/bin/env node

/**
 * Go-Zero API契約ファイルからTypeScript型定義を生成するスクリプト
 * 使用法: node generate_frontend_types.js
 */

const fs = require('fs');
const path = require('path');

// 設定
const CONFIG = {
  apiFiles: [
    path.join(__dirname, '../backend/test_api/test_api.api'),
    path.join(__dirname, '../backend/dashboard_gateway/dashboard_gateway.api'),
    // 他のAPIファイルがあればここに追加
  ],
  outputDir: path.join(__dirname, '../frontend/src/types/generated'),
  clientOutputDir: path.join(__dirname, '../frontend/src/lib/api/generated'),
};

// Go-Zero型からTypeScript型へのマッピング
const TYPE_MAPPING = {
  'string': 'string',
  'int': 'number',
  'int32': 'number', 
  'int64': 'number',
  'float32': 'number',
  'float64': 'number',
  'bool': 'boolean',
  'interface{}': 'any',
  'time.Time': 'string', // ISO string format
};

/**
 * APIファイルを解析して型情報を抽出
 */
function parseApiFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  const types = [];
  const endpoints = [];
  let currentType = null;
  let currentService = null;
  let inService = false;
  let serviceGroup = '';
  let servicePrefix = '';
  let jwtAuth = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // 型定義の開始
    if (line.startsWith('type ') && line.includes('{')) {
      const typeName = line.match(/type\s+(\w+)/)?.[1];
      if (typeName) {
        currentType = {
          name: typeName,
          fields: [],
          description: extractComment(lines, i - 1)
        };
      }
    }
    
    // 型定義のフィールド
    else if (currentType && line.includes('`json:')) {
      const fieldMatch = line.match(/(\w+)\s+(.+?)\s+`json:"(.+?)"`/);
      if (fieldMatch) {
        const [, fieldName, fieldType, jsonName] = fieldMatch;
        currentType.fields.push({
          name: fieldName,
          type: convertType(fieldType),
          jsonName: jsonName,
          optional: fieldType.includes('*') || fieldType.includes('?'),
          description: extractInlineComment(line)
        });
      }
    }
    
    // 型定義の終了
    else if (currentType && line === '}') {
      types.push(currentType);
      currentType = null;
    }
    
    // サービス定義の開始
    else if (line.includes('@server(')) {
      const serverConfig = extractServerConfig(lines, i);
      serviceGroup = serverConfig.group || '';
      servicePrefix = serverConfig.prefix || '';
      jwtAuth = !!serverConfig.jwt;
    }
    
    // サービス定義
    else if (line.startsWith('service ')) {
      inService = true;
      const serviceName = line.match(/service\s+(\w+)/)?.[1];
      currentService = serviceName;
    }
    
    // エンドポイント定義
    else if (inService && line.includes('@handler')) {
      const handlerName = line.match(/@handler\s+(\w+)/)?.[1];
      const nextLine = lines[i + 1]?.trim();
      
      if (nextLine && handlerName) {
        const endpoint = parseEndpoint(nextLine, handlerName, serviceGroup, servicePrefix, jwtAuth);
        if (endpoint) {
          endpoints.push(endpoint);
        }
      }
    }
    
    // サービス定義の終了
    else if (inService && line === '}') {
      inService = false;
      currentService = null;
      serviceGroup = '';
      servicePrefix = '';
      jwtAuth = false;
    }
  }
  
  return { types, endpoints };
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
 * エンドポイント行を解析
 */
function parseEndpoint(line, handlerName, group, prefix, requiresAuth) {
  const match = line.match(/(\w+)\s+(.+?)(?:\s+\((.+?)\))?(?:\s+returns\s+\((.+?)\))?/);
  if (!match) return null;
  
  const [, method, path, requestType, responseType] = match;
  
  return {
    name: handlerName,
    method: method.toUpperCase(),
    path: (prefix || '') + path,
    group: group || 'default',
    requestType: requestType?.trim(),
    responseType: responseType?.trim(),
    requiresAuth,
    description: `${handlerName} endpoint`
  };
}

/**
 * Go型をTypeScript型に変換
 */
function convertType(goType) {
  // 配列型の処理
  if (goType.startsWith('[]')) {
    const innerType = goType.slice(2);
    return `${convertType(innerType)}[]`;
  }
  
  // ポインタ型の処理
  if (goType.startsWith('*')) {
    return convertType(goType.slice(1));
  }
  
  // マッピングされた型
  if (TYPE_MAPPING[goType]) {
    return TYPE_MAPPING[goType];
  }
  
  // カスタム型（そのまま使用）
  return goType;
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
 * TypeScript型定義を生成
 */
function generateTypeDefinitions(types) {
  let output = `// このファイルは自動生成されます。手動で編集しないでください。
// Generated at: ${new Date().toISOString()}

`;

  types.forEach(type => {
    if (type.description) {
      output += `/**
 * ${type.description}
 */\n`;
    }
    
    output += `export interface ${type.name} {\n`;
    
    type.fields.forEach(field => {
      if (field.description) {
        output += `  /** ${field.description} */\n`;
      }
      
      const optional = field.optional ? '?' : '';
      output += `  ${field.jsonName}${optional}: ${field.type};\n`;
    });
    
    output += `}\n\n`;
  });

  return output;
}

/**
 * APIクライアント定義を生成
 */
function generateApiClient(endpoints, types) {
  let output = `// このファイルは自動生成されます。手動で編集しないでください。
// Generated at: ${new Date().toISOString()}

import { apiRequest } from '../client';

`;

  // 型のインポート
  const usedTypes = new Set();
  endpoints.forEach(endpoint => {
    if (endpoint.requestType && endpoint.requestType !== 'void') {
      usedTypes.add(endpoint.requestType);
    }
    if (endpoint.responseType && endpoint.responseType !== 'void') {
      usedTypes.add(endpoint.responseType);
    }
  });

  if (usedTypes.size > 0) {
    output += `import type {\n`;
    Array.from(usedTypes).forEach(type => {
      output += `  ${type},\n`;
    });
    output += `} from '../../types/generated';\n\n`;
  }

  // グループ別にエンドポイントを分類
  const endpointGroups = {};
  endpoints.forEach(endpoint => {
    const group = endpoint.group || 'default';
    if (!endpointGroups[group]) {
      endpointGroups[group] = [];
    }
    endpointGroups[group].push(endpoint);
  });

  // APIクライアント関数を生成
  Object.keys(endpointGroups).forEach(group => {
    const groupEndpoints = endpointGroups[group];
    const groupName = group === 'default' ? 'api' : group;
    
    output += `/**\n * ${groupName} API functions\n */\n`;
    output += `export const ${groupName} = {\n`;
    
    groupEndpoints.forEach(endpoint => {
      const funcName = endpoint.name;
      const hasRequest = endpoint.requestType && endpoint.requestType !== 'void';
      const hasResponse = endpoint.responseType && endpoint.responseType !== 'void';
      
      // 関数のシグネチャ
      let params = '';
      if (hasRequest) {
        params = `data: ${endpoint.requestType}`;
      }
      
      let returnType = 'Promise<void>';
      if (hasResponse) {
        returnType = `Promise<${endpoint.responseType}>`;
      }
      
      output += `  /**\n   * ${endpoint.description}\n`;
      if (endpoint.requiresAuth) {
        output += `   * @requires Authentication\n`;
      }
      output += `   */\n`;
      
      output += `  ${funcName}: (${params}): ${returnType} => {\n`;
      
      if (hasRequest) {
        output += `    return apiRequest.${endpoint.method.toLowerCase()}<${hasResponse ? endpoint.responseType : 'void'}>('${endpoint.path}', data);\n`;
      } else {
        output += `    return apiRequest.${endpoint.method.toLowerCase()}<${hasResponse ? endpoint.responseType : 'void'}>('${endpoint.path}');\n`;
      }
      
      output += `  },\n\n`;
    });
    
    output += `};\n\n`;
  });

  return output;
}

/**
 * React Query フック定義を生成
 */
function generateReactQueryHooks(endpoints) {
  let output = `// このファイルは自動生成されます。手動で編集しないでください。
// Generated at: ${new Date().toISOString()}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './index';

`;

  endpoints.forEach(endpoint => {
    const funcName = endpoint.name;
    const hasRequest = endpoint.requestType && endpoint.requestType !== 'void';
    const hasResponse = endpoint.responseType && endpoint.responseType !== 'void';
    
    if (endpoint.method === 'GET') {
      // Query Hook
      output += `/**\n * ${endpoint.description}\n */\n`;
      
      let params = '';
      if (hasRequest) {
        params = `params: ${endpoint.requestType}`;
      }
      
      output += `export function use${capitalize(funcName)}(${params}) {\n`;
      output += `  return useQuery({\n`;
      
      if (hasRequest) {
        output += `    queryKey: ['${funcName}', params],\n`;
        output += `    queryFn: () => api.${endpoint.group || 'api'}.${funcName}(params),\n`;
      } else {
        output += `    queryKey: ['${funcName}'],\n`;
        output += `    queryFn: () => api.${endpoint.group || 'api'}.${funcName}(),\n`;
      }
      
      output += `  });\n`;
      output += `}\n\n`;
    } else {
      // Mutation Hook
      output += `/**\n * ${endpoint.description}\n */\n`;
      output += `export function use${capitalize(funcName)}() {\n`;
      output += `  const queryClient = useQueryClient();\n`;
      output += `  \n`;
      output += `  return useMutation({\n`;
      
      if (hasRequest) {
        output += `    mutationFn: (data: ${endpoint.requestType}) => api.${endpoint.group || 'api'}.${funcName}(data),\n`;
      } else {
        output += `    mutationFn: () => api.${endpoint.group || 'api'}.${funcName}(),\n`;
      }
      
      output += `    onSuccess: () => {\n`;
      output += `      // 関連するクエリを無効化\n`;
      output += `      queryClient.invalidateQueries({ queryKey: ['${funcName}'] });\n`;
      output += `    },\n`;
      output += `  });\n`;
      output += `}\n\n`;
    }
  });

  return output;
}

/**
 * 文字列の最初の文字を大文字にする
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * ディレクトリを作成（存在しない場合）
 */
function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * メイン実行関数
 */
function main() {
  console.log('🚀 Go-Zero API契約ファイルからTypeScript型定義を生成中...');
  
  // 出力ディレクトリを作成
  ensureDirectory(CONFIG.outputDir);
  ensureDirectory(CONFIG.clientOutputDir);
  
  let allTypes = [];
  let allEndpoints = [];
  
  // 各APIファイルを処理
  CONFIG.apiFiles.forEach(apiFile => {
    if (fs.existsSync(apiFile)) {
      console.log(`📄 解析中: ${path.basename(apiFile)}`);
      const { types, endpoints } = parseApiFile(apiFile);
      allTypes = allTypes.concat(types);
      allEndpoints = allEndpoints.concat(endpoints);
    } else {
      console.warn(`⚠️  ファイルが見つかりません: ${apiFile}`);
    }
  });
  
  // TypeScript型定義を生成
  const typeDefinitions = generateTypeDefinitions(allTypes);
  const typesPath = path.join(CONFIG.outputDir, 'types.ts');
  fs.writeFileSync(typesPath, typeDefinitions);
  console.log(`✅ 型定義を生成: ${typesPath}`);
  
  // APIクライアントを生成
  const apiClient = generateApiClient(allEndpoints, allTypes);
  const clientPath = path.join(CONFIG.clientOutputDir, 'index.ts');
  fs.writeFileSync(clientPath, apiClient);
  console.log(`✅ APIクライアントを生成: ${clientPath}`);
  
  // React Query フックを生成
  const reactQueryHooks = generateReactQueryHooks(allEndpoints);
  const hooksPath = path.join(CONFIG.clientOutputDir, 'hooks.ts');
  fs.writeFileSync(hooksPath, reactQueryHooks);
  console.log(`✅ React Queryフックを生成: ${hooksPath}`);
  
  // 統計情報を表示
  console.log('\n📊 生成統計:');
  console.log(`   型定義: ${allTypes.length}個`);
  console.log(`   エンドポイント: ${allEndpoints.length}個`);
  console.log(`   認証が必要なエンドポイント: ${allEndpoints.filter(e => e.requiresAuth).length}個`);
  
  console.log('\n🎉 型定義の生成が完了しました！');
}

// スクリプトが直接実行された場合にメイン関数を実行
if (require.main === module) {
  main();
}

module.exports = { parseApiFile, generateTypeDefinitions, generateApiClient };