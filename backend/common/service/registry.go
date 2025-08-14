package service

import (
    "context"
    "fmt"
    "sync"
    "time"
    
    "github.com/zeromicro/go-zero/core/logx"
)

// ServiceInfo サービス情報
type ServiceInfo struct {
    Name        string    `json:"name"`
    Host        string    `json:"host"`
    Port        int       `json:"port"`
    Protocol    string    `json:"protocol"`
    HealthCheck string    `json:"health_check"`
    Status      string    `json:"status"`
    LastCheck   time.Time `json:"last_check"`
    Metadata    map[string]string `json:"metadata"`
}

// ServiceRegistry サービスレジストリ
type ServiceRegistry struct {
    services map[string]*ServiceInfo
    mutex    sync.RWMutex
    checker  *HealthChecker
}

// NewServiceRegistry 新しいサービスレジストリを作成
func NewServiceRegistry() *ServiceRegistry {
    registry := &ServiceRegistry{
        services: make(map[string]*ServiceInfo),
        checker:  NewHealthChecker(),
    }
    
    // ヘルスチェックを定期実行
    go registry.startHealthCheck()
    
    return registry
}

// Register サービスを登録
func (r *ServiceRegistry) Register(service *ServiceInfo) error {
    r.mutex.Lock()
    defer r.mutex.Unlock()
    
    if service.Name == "" {
        return fmt.Errorf("service name is required")
    }
    
    service.Status = "healthy"
    service.LastCheck = time.Now()
    
    r.services[service.Name] = service
    logx.Infof("Service registered: %s at %s:%d", service.Name, service.Host, service.Port)
    
    return nil
}

// Deregister サービスを登録解除
func (r *ServiceRegistry) Deregister(serviceName string) error {
    r.mutex.Lock()
    defer r.mutex.Unlock()
    
    if _, exists := r.services[serviceName]; !exists {
        return fmt.Errorf("service %s not found", serviceName)
    }
    
    delete(r.services, serviceName)
    logx.Infof("Service deregistered: %s", serviceName)
    
    return nil
}

// Discover サービスを検索
func (r *ServiceRegistry) Discover(serviceName string) (*ServiceInfo, error) {
    r.mutex.RLock()
    defer r.mutex.RUnlock()
    
    service, exists := r.services[serviceName]
    if !exists {
        return nil, fmt.Errorf("service %s not found", serviceName)
    }
    
    if service.Status != "healthy" {
        return nil, fmt.Errorf("service %s is not healthy", serviceName)
    }
    
    return service, nil
}

// GetAll すべてのサービスを取得
func (r *ServiceRegistry) GetAll() map[string]*ServiceInfo {
    r.mutex.RLock()
    defer r.mutex.RUnlock()
    
    result := make(map[string]*ServiceInfo)
    for k, v := range r.services {
        result[k] = v
    }
    
    return result
}

// GetHealthyServices 健康なサービスのみ取得
func (r *ServiceRegistry) GetHealthyServices() []*ServiceInfo {
    r.mutex.RLock()
    defer r.mutex.RUnlock()
    
    var healthy []*ServiceInfo
    for _, service := range r.services {
        if service.Status == "healthy" {
            healthy = append(healthy, service)
        }
    }
    
    return healthy
}

// startHealthCheck ヘルスチェックを開始
func (r *ServiceRegistry) startHealthCheck() {
    ticker := time.NewTicker(30 * time.Second)
    defer ticker.Stop()
    
    for range ticker.C {
        r.checkAllServices()
    }
}

// checkAllServices すべてのサービスをチェック
func (r *ServiceRegistry) checkAllServices() {
    r.mutex.RLock()
    services := make([]*ServiceInfo, 0, len(r.services))
    for _, service := range r.services {
        services = append(services, service)
    }
    r.mutex.RUnlock()
    
    for _, service := range services {
        go r.checkService(service)
    }
}

// checkService 個別サービスをチェック
func (r *ServiceRegistry) checkService(service *ServiceInfo) {
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()
    
    healthy := r.checker.Check(ctx, service)
    
    r.mutex.Lock()
    defer r.mutex.Unlock()
    
    if s, exists := r.services[service.Name]; exists {
        s.LastCheck = time.Now()
        if healthy {
            s.Status = "healthy"
        } else {
            s.Status = "unhealthy"
            logx.Errorf("Service %s is unhealthy", service.Name)
        }
    }
}

// HealthChecker ヘルスチェッカー
type HealthChecker struct {
    client *http.Client
}

// NewHealthChecker 新しいヘルスチェッカーを作成
func NewHealthChecker() *HealthChecker {
    return &HealthChecker{
        client: &http.Client{
            Timeout: 5 * time.Second,
        },
    }
}

// Check サービスの健康状態をチェック
func (h *HealthChecker) Check(ctx context.Context, service *ServiceInfo) bool {
    url := fmt.Sprintf("%s://%s:%d%s", 
        service.Protocol, 
        service.Host, 
        service.Port, 
        service.HealthCheck)
    
    req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
    if err != nil {
        return false
    }
    
    resp, err := h.client.Do(req)
    if err != nil {
        return false
    }
    defer resp.Body.Close()
    
    return resp.StatusCode == http.StatusOK
}

// LoadBalancer 負荷分散
type LoadBalancer struct {
    registry *ServiceRegistry
    counter  uint64
    mutex    sync.Mutex
}

// NewLoadBalancer 新しいロードバランサーを作成
func NewLoadBalancer(registry *ServiceRegistry) *LoadBalancer {
    return &LoadBalancer{
        registry: registry,
    }
}

// GetNext ラウンドロビンで次のサービスを取得
func (lb *LoadBalancer) GetNext(serviceName string) (*ServiceInfo, error) {
    services := lb.registry.GetHealthyServices()
    
    if len(services) == 0 {
        return nil, fmt.Errorf("no healthy services available")
    }
    
    // サービス名でフィルタリング
    var filtered []*ServiceInfo
    for _, s := range services {
        if s.Name == serviceName {
            filtered = append(filtered, s)
        }
    }
    
    if len(filtered) == 0 {
        return nil, fmt.Errorf("no healthy %s services available", serviceName)
    }
    
    lb.mutex.Lock()
    defer lb.mutex.Unlock()
    
    index := lb.counter % uint64(len(filtered))
    lb.counter++
    
    return filtered[index], nil
}