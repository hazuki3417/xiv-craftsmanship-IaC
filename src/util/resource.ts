/**
 * 変換処理
 */
const casename = {
  camel: (str: string) => {
    return str
      .replace(/([-_]\w)/g, (matches) => matches[1].toUpperCase())
      .replace(/(^\w)/, (matches) => matches.toLowerCase())
      .replace(/[-_]/g, '');
  },
  pascal: (str: string) => {
    return str
      .replace(/([-_]\w)/g, (matches) => matches[1].toUpperCase())
      .replace(/(^\w)/, (matches) => matches.toUpperCase())
      .replace(/[-_]/g, '');
  }
}

export interface Cfn {
  id:  string
  export: string
}

export interface Resource {
  id: string,
  name: string,
  cfn: (suffix: string) => Cfn
}

export interface NamespaceParams {
  env: string
  service: string
}

export interface CreateParams extends NamespaceParams {
  id: string
  name: string
}

/**
 * 共通ロジックを生成するためのヘルパー関数
 */
export const create = (args: CreateParams): Resource => {
  const {env, service, id, name} = args;

  const resource = {
    id: `${casename.pascal(env)}-${casename.pascal(id)}-${casename.pascal(name)}`,
    name: `${env}-${service}-${name}`,
  }

  const cfn = (suffix: string) => ({
    id: `${resource.id}${casename.pascal(suffix)}`,
    export: `${resource.name}${casename.pascal(suffix)}`,
  })

  return {
    ...resource,
    cfn,
  }
}
