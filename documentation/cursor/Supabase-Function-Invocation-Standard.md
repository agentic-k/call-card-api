````markdown
# Supabase Function Invocation Standard  
**Version:** 1.1.0  
**Last updated:** 2025-05-08

A set of conventions and guidelines to generate, update, and maintain Supabase Edge Function clients consistently across projects.

---

## 1. File & Folder Structure (Scalability)  
- **Core helper** lives in  
  `src/lib/supabase/functionsClient.ts`  
- **Domain modules** live in parallel folders, e.g.  
  `src/lib/supabase/templatesClient.ts`  
  `src/lib/supabase/usersClient.ts`  
- Group by feature or bounded context so each file remains small and focused.

## 2. File & Naming Conventions  
1. **File names** use `camelCase` (e.g. `functionsClient.ts`).  
2. **Function names**  
   - Generic CRUD wrappers: `getFunction`, `postFunction`, `putFunction`, `patchFunction`, `deleteFunction`  
   - Domain-specific calls: `<verb><Resource>` (e.g. `getTemplates`, `createUser`).

## 3. Import Statements  
```ts
import { supabase } from '@/integrations/supabase/client'
````

* Only import types (e.g. `FunctionInvokeOptions`, `Database`) where needed.

## 4. Core Invoker Helper

```ts
async function invokeFn<T>(
  name: string,
  opts: FunctionInvokeOptions
): Promise<T> { … }
```

### Responsibilities

1. **Authorization**

   * Merge in `Authorization: Bearer <token>` from `supabase.auth.getSession()`.
2. **URL handling**

   * `name` should map one-to-one with your Edge Function path.
   * Enforce no leading slashes or double-dots.
3. **JSON serialization**

   * Let `supabase-js` stringify objects automatically; don’t pre-stringify.
4. **Resilience**

   * Wrap calls in a timeout (e.g. via `AbortController`) and retry failed requests up to 2×.
5. **Runtime validation**

   * Optionally decode and validate `data` against a Zod or io-ts schema before returning.
6. **Error + no-data checks**

   * Throw on `error` or `data == null`.

## 5. CRUD Wrappers

```ts
export function getFunction<T>(name: string): Promise<T> { … }
export function postFunction<T,B = unknown>(name: string, body: B): Promise<T> { … }
export function putFunction<T,B = unknown>(name: string, body: B): Promise<T> { … }
export function patchFunction<T,B = unknown>(name: string, body: B): Promise<T> { … }
export function deleteFunction<T>(name: string): Promise<T> { … }
```

* Reuse `invokeFn` for each HTTP verb.

## 6. Error Handling

1. **Invoke error**:

   ```ts
   if (error)
     throw new Error(`${name} invocation error: ${error.message}`)
   ```
2. **Missing data**:

   ```ts
   if (data == null)
     throw new Error(`${name} returned no data`)
   ```

* Do **not** treat other falsy values (`0`, `''`, `false`, `[]`) as errors unless domain logic demands it.

## 7. Type Safety & Validation

* Annotate return types: `Promise<T>`.
* Use generics for request bodies: `B = unknown`.
* **Runtime**: validate responses with a schema library to catch breaking changes early.

## 8. Structured Logging (Optional / Debug)

* In development only, log via a wrapper service instead of `console.log`.
* Include: function name, HTTP method, URL, response time, status, and optionally payload.

## 9. Timeouts & Retries (Resilience)

* Wrap `invoke()` in an `AbortController` with a 5 s timeout.
* On network errors or 5xx responses, retry up to two times with exponential backoff.

## 10. Cursor Prompt Guidelines (Usability)

When prompting Cursor to generate or update:

1. **Context**: file path + existing snippet.
2. **Task**: precise (“Add `patchFunction` calling `invokeFn` with method ‘PATCH’”).
3. **Constraints**: reference error/logging/runtime-validation rules.
4. **Example**: show 1–2 lines of usage (`await postFunction('templates', { … })`).

---

> **Outcome:**
>
> * **Consistent** headers, error patterns, and file structure
> * **Maintainable** single helper for cross-cutting concerns
> * **Predictable** naming, type signatures, and runtime safety
> * **Scalable** as your codebase and team grow

```

Let me know if you’d like further tweaks or want to add any additional sections!
```
