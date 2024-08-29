import { namespace } from "../lib/namespace";

/**
 * リソース・エクスポート名の重複を確認する
 * NOTE: すでにデプロイされているリソースがある状態からconstruct idやexport nameをかえると
 *       stack間の依存関係により変更や削除ができず、stackの依存関係などを調べることになる。
 *       deployなどを行う前に名前を定義し、問題ないかどうか確認した後にdeployするように運用する。
 */
test("duplacate namespace", () => {
	const name = namespace({
		stage: "development",
		service: "xiv-craftsmanship",
	});
	console.debug("aws construct ids", name.ids.toArray());
	console.debug("aws resource names", name.names.toArray());
	console.debug("aws cfn export names", name.cfnExportNames.toArray());
	expect(name.ids.isError()).toBe(false);
	expect(name.cfnExportNames.isError()).toBe(false);
});
