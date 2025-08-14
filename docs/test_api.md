### 1. N/A

1. route definition

- Url: /api/login
- Method: POST
- Request: `LoginReq`
- Response: `LoginRes`

2. request definition



```golang
type LoginReq struct {
	Email string `json:"email"`
	Password string `json:"password"`
}
```


3. response definition



```golang
type LoginRes struct {
	AccessToken string `json:"access_token"`
	ExpireTime int64 `json:"expire_time"`
}
```

### 2. N/A

1. route definition

- Url: /api/register
- Method: POST
- Request: `RegisterReq`
- Response: `RegisterRes`

2. request definition



```golang
type RegisterReq struct {
	Name string `json:"name"`
	Email string `json:"email"`
	Password string `json:"password"`
}
```


3. response definition



```golang
type RegisterRes struct {
	Id int64 `json:"id"`
	Name string `json:"name"`
	Email string `json:"email"`
}
```

### 3. N/A

1. route definition

- Url: /api/user/info
- Method: GET
- Request: `-`
- Response: `UserInfoRes`

2. request definition



3. response definition



```golang
type UserInfoRes struct {
	Id int64 `json:"id"`
	Name string `json:"name"`
	Email string `json:"email"`
}
```

### 4. N/A

1. route definition

- Url: /api/user/profile
- Method: POST
- Request: `RegisterReq`
- Response: `RegisterRes`

2. request definition



```golang
type RegisterReq struct {
	Name string `json:"name"`
	Email string `json:"email"`
	Password string `json:"password"`
}
```


3. response definition



```golang
type RegisterRes struct {
	Id int64 `json:"id"`
	Name string `json:"name"`
	Email string `json:"email"`
}
```

