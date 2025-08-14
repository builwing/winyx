#!/usr/bin/env node

/**
 * Go-Zero API契約ファイルからFlutter/Dart用コードを生成
 */

const fs = require('fs');
const path = require('path');

// 設定
const CONFIG = {
  apiFiles: [
    path.join(__dirname, '../backend/test_api/test_api.api'),
  ],
  outputDir: path.join(__dirname, '../mobile/flutter_app/lib/generated'),
  packageName: 'winyx_api',
};

/**
 * Go型からDart型に変換
 */
function convertToDartType(goType) {
  const typeMapping = {
    'string': 'String',
    'int': 'int',
    'int32': 'int', 
    'int64': 'int',
    'float32': 'double',
    'float64': 'double',
    'bool': 'bool',
    'interface{}': 'dynamic',
    'time.Time': 'DateTime',
  };

  // 配列型の処理
  if (goType.startsWith('[]')) {
    const innerType = goType.slice(2);
    return `List<${convertToDartType(innerType)}>`;
  }

  // ポインタ型の処理（Dartではnull許可）
  if (goType.startsWith('*')) {
    return `${convertToDartType(goType.slice(1))}?`;
  }

  // 基本型のマッピング
  if (typeMapping[goType]) {
    return typeMapping[goType];
  }

  // カスタム型
  return goType;
}

/**
 * Dart用クラス定義の生成
 */
function generateDartClasses(types) {
  let output = `// このファイルは自動生成されます。手動で編集しないでください。
// Generated at: ${new Date().toISOString()}

import 'dart:convert';

`;

  types.forEach(type => {
    if (type.description) {
      output += `/// ${type.description}\n`;
    }
    
    output += `class ${type.name} {\n`;
    
    // フィールド定義
    type.fields.forEach(field => {
      if (field.description) {
        output += `  /// ${field.description}\n`;
      }
      
      const dartType = convertToDartType(field.type);
      const nullable = field.optional ? '?' : '';
      output += `  final ${dartType}${nullable} ${field.jsonName};\n\n`;
    });
    
    // コンストラクタ
    output += `  const ${type.name}({\n`;
    type.fields.forEach(field => {
      const required = field.optional ? '' : 'required ';
      output += `    ${required}this.${field.jsonName},\n`;
    });
    output += `  });\n\n`;
    
    // fromJson
    output += `  factory ${type.name}.fromJson(Map<String, dynamic> json) {\n`;
    output += `    return ${type.name}(\n`;
    type.fields.forEach(field => {
      const dartType = convertToDartType(field.type);
      if (dartType === 'DateTime') {
        output += `      ${field.jsonName}: json['${field.jsonName}'] != null ? DateTime.parse(json['${field.jsonName}']) : null,\n`;
      } else {
        output += `      ${field.jsonName}: json['${field.jsonName}'],\n`;
      }
    });
    output += `    );\n`;
    output += `  }\n\n`;
    
    // toJson
    output += `  Map<String, dynamic> toJson() {\n`;
    output += `    return {\n`;
    type.fields.forEach(field => {
      const dartType = convertToDartType(field.type);
      if (dartType === 'DateTime') {
        output += `      '${field.jsonName}': ${field.jsonName}?.toIso8601String(),\n`;
      } else {
        output += `      '${field.jsonName}': ${field.jsonName},\n`;
      }
    });
    output += `    };\n`;
    output += `  }\n`;
    
    // toString
    output += `  @override\n`;
    output += `  String toString() {\n`;
    output += `    return '${type.name}{${type.fields.map(f => `${f.jsonName}: \$${f.jsonName}`).join(', ')}}';\n`;
    output += `  }\n`;
    
    // operator==
    output += `  @override\n`;
    output += `  bool operator ==(Object other) {\n`;
    output += `    if (identical(this, other)) return true;\n`;
    output += `    return other is ${type.name} &&\n`;
    type.fields.forEach((field, index) => {
      const isLast = index === type.fields.length - 1;
      output += `        other.${field.jsonName} == ${field.jsonName}${isLast ? ';\n' : ' &&\n'}`;
    });
    output += `  }\n`;
    
    // hashCode
    output += `  @override\n`;
    output += `  int get hashCode {\n`;
    output += `    return Object.hash(${type.fields.map(f => f.jsonName).join(', ')});\n`;
    output += `  }\n`;
    
    output += `}\n\n`;
  });

  return output;
}

/**
 * Dart用APIクライアントの生成
 */
function generateDartApiClient(endpoints, types) {
  let output = `// このファイルは自動生成されます。手動で編集しないでください。
// Generated at: ${new Date().toISOString()}

import 'dart:convert';
import 'package:http/http.dart' as http;
import 'models.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final Map<String, dynamic>? details;
  
  const ApiException(this.message, [this.statusCode, this.details]);
  
  @override
  String toString() => 'ApiException: $message (Status: $statusCode)';
}

class WinyxApiClient {
  final String baseUrl;
  final Map<String, String> _defaultHeaders;
  final Duration timeout;
  String? _authToken;

  WinyxApiClient({
    required this.baseUrl,
    Map<String, String>? headers,
    this.timeout = const Duration(seconds: 30),
  }) : _defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...?headers,
  };

  /// 認証トークンを設定
  void setAuthToken(String token) {
    _authToken = token;
  }

  /// 認証トークンをクリア
  void clearAuthToken() {
    _authToken = null;
  }

  /// HTTPヘッダーを取得
  Map<String, String> get _headers {
    final headers = Map<String, String>.from(_defaultHeaders);
    if (_authToken != null) {
      headers['Authorization'] = 'Bearer $_authToken';
    }
    return headers;
  }

  /// HTTP GETリクエスト
  Future<T> _get<T>(String endpoint, T Function(Map<String, dynamic>) fromJson) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl$endpoint'),
        headers: _headers,
      ).timeout(timeout);

      return _handleResponse(response, fromJson);
    } catch (e) {
      throw ApiException('Network error: $e');
    }
  }

  /// HTTP POSTリクエスト
  Future<T> _post<T>(
    String endpoint,
    Map<String, dynamic> body,
    T Function(Map<String, dynamic>) fromJson,
  ) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl$endpoint'),
        headers: _headers,
        body: jsonEncode(body),
      ).timeout(timeout);

      return _handleResponse(response, fromJson);
    } catch (e) {
      throw ApiException('Network error: $e');
    }
  }

  /// HTTP PUTリクエスト
  Future<T> _put<T>(
    String endpoint,
    Map<String, dynamic> body,
    T Function(Map<String, dynamic>) fromJson,
  ) async {
    try {
      final response = await http.put(
        Uri.parse('$baseUrl$endpoint'),
        headers: _headers,
        body: jsonEncode(body),
      ).timeout(timeout);

      return _handleResponse(response, fromJson);
    } catch (e) {
      throw ApiException('Network error: $e');
    }
  }

  /// HTTP DELETEリクエスト
  Future<void> _delete(String endpoint) async {
    try {
      final response = await http.delete(
        Uri.parse('$baseUrl$endpoint'),
        headers: _headers,
      ).timeout(timeout);

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw ApiException(
          'Request failed: ${response.body}',
          response.statusCode,
        );
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException('Network error: $e');
    }
  }

  /// レスポンス処理
  T _handleResponse<T>(http.Response response, T Function(Map<String, dynamic>) fromJson) {
    if (response.statusCode < 200 || response.statusCode >= 300) {
      Map<String, dynamic>? errorDetails;
      try {
        errorDetails = jsonDecode(response.body);
      } catch (_) {}
      
      throw ApiException(
        errorDetails?['message'] ?? 'Request failed: ${response.body}',
        response.statusCode,
        errorDetails,
      );
    }

    try {
      final jsonData = jsonDecode(response.body) as Map<String, dynamic>;
      return fromJson(jsonData);
    } catch (e) {
      throw ApiException('Failed to parse response: $e', response.statusCode);
    }
  }

`;

  // エンドポイント別メソッド生成
  endpoints.forEach(endpoint => {
    const methodName = _camelCase(endpoint.name);
    const hasRequest = endpoint.requestType && endpoint.requestType !== 'void';
    const hasResponse = endpoint.responseType && endpoint.responseType !== 'void';
    
    output += `  /// ${endpoint.description}\n`;
    if (endpoint.requiresAuth) {
      output += `  /// 認証が必要です\n`;
    }
    
    let params = '';
    if (hasRequest) {
      params = `${endpoint.requestType} request`;
    }
    
    let returnType = 'Future<void>';
    if (hasResponse) {
      returnType = `Future<${endpoint.responseType}>`;
    }
    
    output += `  ${returnType} ${methodName}(${params}) async {\n`;
    
    if (hasRequest && hasResponse) {
      output += `    return _${endpoint.method.toLowerCase()}<${endpoint.responseType}>(\n`;
      output += `      '${endpoint.path}',\n`;
      output += `      request.toJson(),\n`;
      output += `      ${endpoint.responseType}.fromJson,\n`;
      output += `    );\n`;
    } else if (hasRequest) {
      output += `    await _${endpoint.method.toLowerCase()}(\n`;
      output += `      '${endpoint.path}',\n`;
      output += `      request.toJson(),\n`;
      output += `      (json) => {},\n`;
      output += `    );\n`;
    } else if (hasResponse) {
      output += `    return _get<${endpoint.responseType}>(\n`;
      output += `      '${endpoint.path}',\n`;
      output += `      ${endpoint.responseType}.fromJson,\n`;
      output += `    );\n`;
    } else {
      output += `    await _${endpoint.method.toLowerCase()}('${endpoint.path}');\n`;
    }
    
    output += `  }\n\n`;
  });
  
  output += `}\n`;

  return output;
}

/**
 * camelCase変換
 */
function _camelCase(str) {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

/**
 * pubspec.yamlファイルの生成
 */
function generatePubspecYaml() {
  return `name: ${CONFIG.packageName}
description: Winyx API client generated from Go-Zero contracts
version: 1.0.0

environment:
  sdk: '>=3.0.0 <4.0.0'
  flutter: ">=3.10.0"

dependencies:
  flutter:
    sdk: flutter
  http: ^1.1.0
  json_annotation: ^4.8.1

dev_dependencies:
  flutter_test:
    sdk: flutter
  json_serializable: ^6.7.1
  build_runner: ^2.4.7
  flutter_lints: ^3.0.1

flutter:
  uses-material-design: true
`;
}

/**
 * メイン実行
 */
function main() {
  console.log('🚀 Flutter/Dart用コードを生成中...');
  
  // 出力ディレクトリを作成
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }
  
  // 型定義とエンドポイントの解析（既存の関数を再利用）
  const { parseApiFile } = require('./generate_frontend_types');
  
  let allTypes = [];
  let allEndpoints = [];
  
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
  
  // Dart用モデルクラスの生成
  const dartModels = generateDartClasses(allTypes);
  const modelsPath = path.join(CONFIG.outputDir, 'models.dart');
  fs.writeFileSync(modelsPath, dartModels);
  console.log(`✅ Dartモデルを生成: ${modelsPath}`);
  
  // Dart用APIクライアントの生成
  const dartApiClient = generateDartApiClient(allEndpoints, allTypes);
  const clientPath = path.join(CONFIG.outputDir, 'api_client.dart');
  fs.writeFileSync(clientPath, dartApiClient);
  console.log(`✅ DartAPIクライアントを生成: ${clientPath}`);
  
  // pubspec.yamlの生成
  const pubspecContent = generatePubspecYaml();
  const pubspecPath = path.join(path.dirname(CONFIG.outputDir), 'pubspec.yaml');
  fs.writeFileSync(pubspecPath, pubspecContent);
  console.log(`✅ pubspec.yamlを生成: ${pubspecPath}`);
  
  console.log('\n📊 生成統計:');
  console.log(`   Dartクラス: ${allTypes.length}個`);
  console.log(`   APIメソッド: ${allEndpoints.length}個`);
  
  console.log('\n🎉 Flutter用コードの生成が完了しました！');
  console.log('\n📝 次の手順:');
  console.log('1. Flutter SDKをインストール');
  console.log('2. flutter pub get で依存関係をインストール');
  console.log('3. 生成されたコードをFlutterプロジェクトで使用');
}

if (require.main === module) {
  main();
}

module.exports = { 
  generateDartClasses, 
  generateDartApiClient, 
  generatePubspecYaml,
  convertToDartType 
};