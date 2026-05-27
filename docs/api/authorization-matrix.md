# Authorization Matrix

| Resource/action | Actor | Control | Negative evidence |
| --- | --- | --- | --- |
| object metadata/read | same-tenant owner or active recipient | tenant + ownership/grant | `TenantAuthorizationTest`, `UnauthorizedAccessTest` |
| grant/create | same-tenant owner, demo baseline only | tenant + ownership + profile guard | `TenantAuthorizationTest`, `ApiIntegrationTest` |
| grant/revoke | same-tenant owner | tenant + owner + package invalidation | `JdbcLiveRepositoryTest` |
| package/download | same-tenant recipient | tenant + grant state/policy/context/proof | `TenantAuthorizationTest`, `PolicyActionAuthorizationTest` |
| proxy transform | same-tenant active assigned proxy, demo only | tenant + role/node/quota/profile | `TenantAuthorizationTest`, `ProxyNodeServiceTest` |
| audit/export | auditor/admin in tenant | role + tenant-filtered events | `ApiIntegrationTest` |

生产 OpenAPI 不提供 baseline transform；正式 envelope/代理部署需要将身份
tenant 条件持久化装配到 repository 查询中。
