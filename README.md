# empower-link

## フォルダ構成
- [bot-server](bot-server)
  - Discord Botアプリの実装
  - 貢献度の確認、及び貢献度に応じたトークンの付与機能を提供
- [contract](contract)
  - 貢献度に応じて付与するトークンのスマートコントラクト
- [contribution-analyzer](contribution-analyzer)
  - AIを用いて貢献度を算出する機能を提供
  - 貢献度の算出方法や精度に関しては[こちら](contribution-analyzer)を参照

## プロダクト概要
### 解決したい課題
- コミュニティ形成の中心となる、Discordなどのオンラインコミュニケーションツール内での貢献度の評価が行えていない。
- 行えたとしても、人手によりスケールしないものか、投稿数・提案数などの単純な集計に限られる。
- 上記理由により貢献しても評価されないためモチベーションが続かない
### ソリューション
- Discordなどのコミュニケーションツール内での会話内容を元に、AIがコミュニティ内の貢献度を評価する。
- 上記に合わせて、貢献度に応じてトークン（NFT/FT）を付与できるようにし、ユーザが相互に貢献度を紹介でき、かつ各種外部サービスとも連動しやすくすることで多様なリワードの提供を実現する。
### デモ動画
- [youtube](https://www.youtube.com/watch?v=83UCYlAb5ZM)


## 開発環境

DevContainerで構築する場合は以下。  

- Docker DeskTopのインストール  
  - https://docs.docker.com/desktop/install/mac-install/
  - https://docs.docker.com/desktop/install/windows-install/
  - https://docs.docker.com/desktop/install/linux-install/

- VSCodeのインストール  
  - https://azure.microsoft.com/ja-jp/products/visual-studio-code

- DevContainerのVSCodeプラグインをインストール  
  -  https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers

- DevContainerの起動
```
git clone https://github.com/blocks-web3/discord-server-test.git

VSCodeでt3フォルダを開く

CTRL + SHIT + P -> Dev Containers: Rebuild and Reopen in Container
```
