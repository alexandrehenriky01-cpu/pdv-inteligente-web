# FRONTEND SECURITY ARCHITECTURE

## Data: 2026-04-23
## Status: COMPLETE

---

## PRINCIPLES

1. **FRONTEND DOES NOT DECIDE ACCESS** - Backend is the final authority
2. **SUPER_ADMIN (SaaS Platform)** - Has platform-level context, separate from store
3. **Store Users (including MASTER)** - Limited to store's modules/features
4. **NO BYPASS BY ROLE** - Role cannot override store rules

---

## ARCHITECTURE

### Layer 1: Authorization Core (`useAuth.ts`)
Central authorization logic - the ONLY source for access decisions.

```typescript
import { createAuthorizationContext, canAccessModule, canAccessFeature, canExecuteAction } from './useAuth';

// Usage
const context = createAuthorizationContext(user);
if (canAccessModule(context, 'FINANCEIRO')) {
  // show module
}
```

### Layer 2: React Hook (`useAuthorization.ts`)
React integration for authorization checks.

```typescript
import { useAuthorization } from './useAuthorization';

function MyComponent({ user }) {
  const { canAccessModule, canAccessFeature } = useAuthorization(user);
  
  if (!canAccessModule('FINANCEIRO')) {
    return <AccessDenied />;
  }
  
  return <FinanceModule />;
}
```

### Layer 3: Route Protection (`ProtectedRoute.tsx`)
Component-based route protection.

```typescript
import { ProtectedRoute } from './components/auth/ProtectedRoute';

<ProtectedRoute 
  user={user}
  config={{ 
    requiredModule: 'FINANCEIRO',
    requiredPermission: 'FINANCEIRO_VIEW'
  }}
>
  <FinancePage />
</ProtectedRoute>
```

### Layer 4: Menu Protection (`filterMenu.ts`)
Menu filtering based ONLY on permissions.

```typescript
import { filterMenuByPermissions } from './config/filterMenu';

const filteredMenu = filterMenuByPermissions(menuConfig, user);
// NO FALLBACK for "show all"
```

---

## FILES CREATED

| File | Purpose |
|------|---------|
| `src/hooks/useAuth.ts` | Core authorization logic |
| `src/hooks/useAuthorization.ts` | React hook for authorization |
| `src/components/auth/ProtectedRoute.tsx` | Route protection components |
| `src/config/filterMenu.ts` | Menu filtering (secured) |

---

## FILES MODIFIED

| File | Changes |
|------|---------|
| `src/hooks/usePermissions.ts` | MASTER no longer is SUPER_ADMIN |
| `src/config/filterMenu.ts` | Added security documentation, NO fallback |

---

## SUPER_ADMIN vs MASTER

| Aspect | SUPER_ADMIN | MASTER (Store) |
|--------|-------------|----------------|
| **Context** | Platform (SaaS) | Store |
| **Bypass** | Yes - platform menu | No - limited to store |
| **Menu** | Platform menu | Store modules only |
| **Access** | All modules | Only store's modules |

---

## VALIDATION

### Test Scenarios

1. **MASTER Store User**
   - Should see ONLY store's active modules
   - Should NOT see modules disabled for store
   - Backend MUST enforce this

2. **SUPER_ADMIN**
   - Should see platform menu
   - Should access platform admin areas
   - Should NOT have automatic store access

3. **Regular Store User**
   - Should see only allowed modules
   - All access checked against store config

---

## USAGE EXAMPLES

### Check Module Access
```typescript
const { canAccessModule } = useAuthorization(user);

if (canAccessModule('FINANCEIRO')) {
  // show
}
```

### Check Feature Access
```typescript
const { canAccessFeature } = useAuthorization(user);

if (canAccessFeature('FINANCEIRO.TITULO_VIEW')) {
  // show
}
```

### Check Permission
```typescript
const { canExecuteAction } = useAuthorization(user);

if (canExecuteAction('FINANCEIRO_VIEW')) {
  // enable button
}
```

### Route Protection
```typescript
<ProtectedRoute
  user={user}
  config={{
    requiredModules: ['FINANCEIRO'],
    requiredPermissions: ['FINANCEIRO_VIEW']
  }}
>
  <FinancePage />
</ProtectedRoute>
```

### 403 Handler
```typescript
import { AccessDeniedPage } from './components/auth/ProtectedRoute';

<ApiErrorHandler
  error={error}
  on403={() => <AccessDeniedPage />}
>
  {children}
</ApiErrorHandler>
```

---

## SECURITY NOTES

- **NO BYPASS BY ROLE** - Even MASTER of store cannot bypass
- **BACKEND IS AUTHORITY** - Frontend reflects, doesn't decide
- **CACHE INVALIDATION** - Happens when store modules change
- **CONSISTENCY** - Frontend and backend use same feature maps

---

## ROLES REFERENCE

### Platform Roles (BYPASS)
- `SUPER_ADMIN` - Full platform access
- `SUPORTE_MASTER` - Platform support access

### Store Roles (LIMITED)
- `MASTER` - Store admin (NOT platform)
- `ADMIN_LOJA` - Store admin
- `GERENTE` - Store manager
- `DIRETOR` - Store director
- `VENDEDOR` - Salesperson
- `CAIXA` - Cashier