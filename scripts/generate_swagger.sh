#!/bin/bash
set -e

# 設定
CONTRACTS_DIR="/var/www/winyx/contracts"
OUTPUT_DIR="/var/www/winyx/contracts/openapi"
GOCTL_SWAGGER="/tmp/go/bin/goctl-swagger"

# 色付き出力関数
print_info() {
    echo -e "\033[0;36m[INFO]\033[0m $1"
}

print_success() {
    echo -e "\033[0;32m[SUCCESS]\033[0m $1"
}

print_error() {
    echo -e "\033[0;31m[ERROR]\033[0m $1"
}

# 出力ディレクトリ作成
print_info "Creating output directory: $OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# goctl-swaggerの存在確認
if [ ! -f "$GOCTL_SWAGGER" ]; then
    print_error "goctl-swagger not found at $GOCTL_SWAGGER"
    print_info "Installing goctl-swagger..."
    GOPATH=/tmp/go GOCACHE=/tmp/gocache go install github.com/zeromicro/goctl-swagger@latest
fi

# 各サービスの契約ファイルを処理
print_info "Searching for .api files in $CONTRACTS_DIR"

# user_service用の契約ファイルを探す
API_FILE="/var/www/winyx/contracts/user_service/user.api"
if [ ! -f "$API_FILE" ]; then
    # 別の場所を探す
    API_FILE="/var/www/winyx/backend/user_service/user.api"
fi

if [ -f "$API_FILE" ]; then
    print_info "Found API file: $API_FILE"
    SERVICE_NAME="user_service"
    
    print_info "Generating OpenAPI specification for $SERVICE_NAME..."
    
    # OpenAPI JSON生成
    cd /var/www/winyx/backend/user_service
    GOPATH=/tmp/go goctl api plugin -plugin "$GOCTL_SWAGGER" -api "$API_FILE" -dir "$OUTPUT_DIR" <<< "swagger -filename ${SERVICE_NAME}.json -host winyx.jp -basepath /api/v1 -schemes https"
    
    if [ -f "$OUTPUT_DIR/${SERVICE_NAME}.json" ]; then
        print_success "Generated: $OUTPUT_DIR/${SERVICE_NAME}.json"
        
        # JSON形式を整形
        python3 -m json.tool "$OUTPUT_DIR/${SERVICE_NAME}.json" > "$OUTPUT_DIR/${SERVICE_NAME}_formatted.json"
        mv "$OUTPUT_DIR/${SERVICE_NAME}_formatted.json" "$OUTPUT_DIR/${SERVICE_NAME}.json"
        
        # YAMLバージョンも生成
        if command -v yq &> /dev/null; then
            yq eval -P "$OUTPUT_DIR/${SERVICE_NAME}.json" > "$OUTPUT_DIR/${SERVICE_NAME}.yaml"
            print_success "Generated: $OUTPUT_DIR/${SERVICE_NAME}.yaml"
        fi
    else
        print_error "Failed to generate OpenAPI specification for $SERVICE_NAME"
    fi
else
    print_error "No API file found for user_service"
fi

# 全体の統計を表示
TOTAL_JSON=$(find "$OUTPUT_DIR" -name "*.json" | wc -l)
TOTAL_YAML=$(find "$OUTPUT_DIR" -name "*.yaml" | wc -l)

print_info "===== Generation Summary ====="
print_info "JSON files generated: $TOTAL_JSON"
print_info "YAML files generated: $TOTAL_YAML"
print_info "Output directory: $OUTPUT_DIR"

if [ $TOTAL_JSON -gt 0 ]; then
    print_success "OpenAPI generation completed successfully!"
else
    print_error "No OpenAPI specifications were generated"
    exit 1
fi