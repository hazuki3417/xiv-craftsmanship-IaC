/**
 * 変換処理
 */
const casename = {
	camel: (str: string) => {
		return str
			.replace(/([-_]\w)/g, (matches) => matches[1].toUpperCase())
			.replace(/(^\w)/, (matches) => matches.toLowerCase())
			.replace(/[-_]/g, "");
	},
	pascal: (str: string) => {
		return str
			.replace(/([-_]\w)/g, (matches) => matches[1].toUpperCase())
			.replace(/(^\w)/, (matches) => matches.toUpperCase())
			.replace(/[-_]/g, "");
	},
	kebab: (str: string) => {
		return str
			.replace(/([A-Z])/g, (matches) => `-${matches[0].toLowerCase()}`)
			.replace(/[-_]/g, "-")
			.replace(/[-]{2,}/g, "-");
	},
};

export interface SetParams {
	env: string;
	service: string;
}

export interface ResourceParams {
	id: string;
	name: string;
}

export interface CfnParams {
	id: string;
}

export interface Set {
	resource: (args: ResourceParams) => { id: string; name: string };
	cfn: (args: CfnParams) => {
		exportId: string;
		importId: string;
		exportName: string;
	};
	ids: Stack;
	names: Stack;
}

export interface Stack {
	push: (id: string) => void;
	toArray: () => string[];
	isError: () => boolean;
	throw: () => void;
}

const stack = (): Stack => {
	const stack: string[] = [];
	let duplacate = false;

	const push = (id: string) => {
		if (stack.includes(id)) {
			duplacate = true;
		}

		stack.push(id);
	};

	const errorThrow = () => {
		if (duplacate) {
			throw new Error("duplacate id");
		}
	};

	const isError = () => {
		return duplacate;
	};

	const toArray = () => {
		return stack.sort();
	};

	return {
		push,
		toArray,
		isError,
		throw: errorThrow,
	};
};

export const set = (args: SetParams): Set => {
	const { env, service } = args;

	const stackId = stack();
	const stackExportName = stack();

	/**
	 * リソース名を生成します
	 * @param id リソースID
	 * @param name リソース名
	 * @returns id: {Env}{Service}{Id}, name: {env}-{service}-{name}
	 */
	const resource = (args: ResourceParams) => {
		const { id, name } = args;

		const strId: string = casename.pascal(`${env}-${service}-${id}`);
		const strName: string = casename.kebab(`${env}-${service}-${name}`);

		stackId.push(strId);

		return {
			id: strId,
			name: strName,
		};
	};

	/**
	 *
	 * @param id リソースID
	 * @returns exportId: {Exp}{Env}{Service}{Id}, importId: {Imp}{Env}{Service}{Id}, exportName: {name}-{env}-{service}-{id}
	 */
	const cfn = (args: CfnParams) => {
		const { id } = args;
		const strExportId = casename.pascal(`exp-${env}-${service}-${id}`);
		const strImportId = casename.pascal(`imp-${env}-${service}-${id}`);
		const strExportName = casename.kebab(`${env}-${service}-${id}`);

		stackId.push(strExportId);
		stackId.push(strImportId);
		stackExportName.push(strExportName);

		return {
			exportId: strExportId,
			importId: strImportId,
			exportName: strExportName,
		};
	};

	return {
		resource,
		cfn,
		ids: stackId,
		names: stackExportName,
	};
};

/**
 * NOTE: 下記のidはすべてのスタックでユニークとなるようにする
 * - resourceのcontruct id
 * - cfn exportのcontract id
 * - cfn exportのexport name
 *
 * stackを作る過程で下記のことをやろうとすると面倒なことになる（stack消したりとか）
 * - export nameを変える
 * - export nameを消す
 *
 * 命名の方針は考えたほうが良さそう。
 * また可能であれば各種idをnamespaceとして集中管理し、重複がないことを保証する仕組みもあったほうが良さそう。
 *
 * export nameを参照しているstackが存在するとき、export nameを出力しているstackはexport nameを変えることはできない
 * またstackの削除もできない（参照先がきえるため）
 */
