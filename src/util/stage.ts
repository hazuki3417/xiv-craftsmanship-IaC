export type StageType = 'production' | 'staging' | 'development';

const verify = () => {
  if (!process.env.ENVIRONMENT) {
    throw new Error('ENVIRONMENT is not defined');
  }
  const names: StageType[] = ['production', 'staging', 'development'];
  if(!names.includes(process.env.ENVIRONMENT as StageType)){
    throw new Error('ENVIRONMENT is invalid');
  }
}

const get = (): StageType => {
  return process.env.ENVIRONMENT as StageType;
}

const environment = {
  verify,
  get,
}

export const stage = (() => {
  const env = environment;

  return {
    env,
    isProduction(): boolean {
      env.verify();
      return env.get() === 'production';
    },
    isStaging(): boolean {
      env.verify();
      return env.get() === 'staging';
    },
    isDevelopment(): boolean {
      env.verify();
      return env.get() === 'development';
    },
    is(name: StageType): boolean {
      env.verify();
      return env.get() === name;
    },
    allow(names: StageType[]): boolean {
      env.verify();
      return names.includes(env.get());
    },
    deny(names: StageType[]): boolean {
      env.verify();
      return !names.includes(env.get());
    }
  };
})();
