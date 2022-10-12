import { observer } from 'mobx-react';
import { PureComponent } from 'react';
import cn from 'classnames';
import { walletsMap, blockchainsMap } from '../../constants';
import domain from '../../stores/Domain';
import { YlideButton } from '../../controls/YlideButton';
import { CloseOutlined } from '@ant-design/icons';
import { Spin, Tooltip } from 'antd';
import SwitchModal from '../../modals/SwitchModal';
import { shrinkAddress } from '../../utils/shrinkAddress';
import { makeObservable, observable } from 'mobx';
import { DomainAccount } from '../../stores/models/DomainAccount';
import { autobind } from 'core-decorators';
import { Wallet } from '../../stores/models/Wallet';
import PasswordNewModal from '../../modals/PasswordModalNew';
import SignatureModal from '../../modals/SignatureModal';
import { IGenericAccount } from '@ylide/sdk';
import { isBytesEqual } from '../../utils/isBytesEqual';
import InsufficentFundsModal from '../../modals/InsufficentFundsModal';
import PublishKeyModal from '../../modals/PublishKeyModal';

export interface WalletBlockProps {
	wallet: string;
	blockchains: string[];
}

@observer
export class AccountBlock extends PureComponent<{ account: DomainAccount }> {
	@observable loading = false;

	constructor(props: { account: DomainAccount }) {
		super(props);

		makeObservable(this);
	}

	// {!account.localKey ? (
	// 	<YlideButton
	// 		small
	// 		style={{ marginRight: 8 }}
	// 		onClick={async () => {
	// 			this.loading = true;
	// 			try {
	// 				const password = await domain.handlePasswordRequest(
	// 					`retrieve key for ${account.account.address}`,
	// 				);
	// 				if (!password) {
	// 					return;
	// 				}
	// 				try {
	// 					await account.createLocalKey(password);
	// 				} catch (err: any) {
	// 					console.error('err: ', err);
	// 					return;
	// 				}
	// 			} catch (err) {
	// 				console.error('err: ', err);
	// 			} finally {
	// 				this.loading = false;
	// 			}
	// 		}}
	// 	>
	// 		{this.loading ? <Spin size="small" /> : 'Unlock'}
	// 	</YlideButton>
	// ) :

	render() {
		const account = this.props.account;
		return (
			<div key={account.account.address} className="wb-account">
				<div className="wb-account-title">{shrinkAddress(account.account.address, 36)}</div>
				<div className="wb-account-actions">
					{!account.isLocalKeyRegistered ? (
						<YlideButton
							small
							style={{ marginRight: 8 }}
							onClick={async () => {
								this.loading = true;
								try {
									await account.attachRemoteKey();
								} finally {
									this.loading = false;
								}
							}}
						>
							{this.loading ? <Spin size="small" /> : 'Publish'}
						</YlideButton>
					) : null}
					<Tooltip title="Disconnect account" placement="bottom">
						<YlideButton
							small
							centered
							onClick={async () => {
								this.loading = true;
								try {
									await account.wallet.disconnectAccount(account);
									await domain.accounts.removeAccount(account);
								} finally {
									this.loading = false;
								}
							}}
						>
							<CloseOutlined style={{ fontSize: 14 }} />
						</YlideButton>
					</Tooltip>
				</div>
			</div>
		);
	}
}

@observer
export class WalletBlock extends PureComponent<WalletBlockProps> {
	@observable loading = false;

	constructor(props: WalletBlockProps) {
		super(props);

		makeObservable(this);
	}

	async publishLocalKey(account: DomainAccount) {
		try {
			const balances = await account.getBalances();
			console.log('balances: ', balances);
			const chain = await account.wallet.controller.getCurrentBlockchain();
			if (Number(balances[chain]) === 0) {
				await InsufficentFundsModal.show(account, 'to publish key');
			}
		} catch (err) {
			console.log('balances err: ', err);
		}
		const publishCtrl = PublishKeyModal.view(account.wallet);
		try {
			await account.attachRemoteKey();
			await account.init();
		} catch (err) {
			alert('Transaction was not published. Please, try again');
		} finally {
			publishCtrl.hide();
		}
	}

	async createLocalKey(wallet: Wallet, account: IGenericAccount) {
		const result = await PasswordNewModal.show('to activate new account');
		if (!result) {
			return;
		}
		let tempLocalKey;
		const signatureCtrl = SignatureModal.view(wallet);
		try {
			tempLocalKey = await wallet.constructLocalKey(account, result.value);
		} finally {
			signatureCtrl.hide();
		}
		let remoteKey;
		try {
			const { remoteKey: remoteKeyInst } = await wallet.readRemoteKeys(account);
			remoteKey = remoteKeyInst;
		} catch (err) {
			alert('Retrieving blockchain keys failed, please, try again');
		}
		if (!remoteKey) {
			const domainAccount = await wallet.instantiateNewAccount(account, tempLocalKey);
			return await this.publishLocalKey(domainAccount);
		} else if (isBytesEqual(remoteKey, tempLocalKey.publicKey)) {
			return await wallet.instantiateNewAccount(account, tempLocalKey);
		} else if (result.forceNew) {
			const domainAccount = await wallet.instantiateNewAccount(account, tempLocalKey);
			return await this.publishLocalKey(domainAccount);
		} else {
			alert('Ylide password was wrong, please, try again');
			return;
		}
	}

	async connectWalletAccount(wallet: Wallet) {
		let currentAccount = await wallet.getCurrentAccount();
		// to fix everwallet stuck in auth state without registered key
		if (
			currentAccount &&
			!wallet.isAccountRegistered(currentAccount) &&
			!wallet.controller.isMultipleAccountsSupported()
		) {
			await wallet.controller.disconnectAccount(currentAccount);
		}
		currentAccount = await wallet.getCurrentAccount();
		if (currentAccount && wallet.isAccountRegistered(currentAccount)) {
			const result = await SwitchModal.show('account', wallet);
			if (!result) {
				return null;
			}
		}
		currentAccount = await wallet.getCurrentAccount();
		if (currentAccount && wallet.isAccountRegistered(currentAccount)) {
			alert('This account is already registered. Please, chose a different one');
			return null;
		} else {
			return await wallet.connectAccount();
		}
	}

	@autobind
	async connectAccount() {
		const wallet = domain.wallets.find(w => w.factory.wallet === this.props.wallet)!;

		this.loading = true;
		try {
			const account = await this.connectWalletAccount(wallet);
			if (!account) {
				return;
			}
			await this.createLocalKey(wallet, account);
		} finally {
			this.loading = false;
		}
	}

	render() {
		const wData = walletsMap[this.props.wallet];

		let headRight: JSX.Element = (
			<div
				style={{
					padding: '12px 20px',
					fontSize: 14,
				}}
			>
				<b>Coming</b>
			</div>
		);

		const blockchainsBlock = (
			<div className="wb-body">
				<div className="wb-title">Blockchains:</div>
				<div className="wb-chains-list">
					{this.props.blockchains.map(blockchain => {
						const bData = blockchainsMap[blockchain];
						const isChainSupported = domain.registeredBlockchains.find(t => t.blockchain === blockchain);
						return (
							<div
								key={blockchain}
								className="wb-chain"
								style={{
									opacity: isChainSupported ? 1 : 0.6,
								}}
							>
								<div className="wb-chain-logo">{bData.logo()}</div>
								<div className="wb-chain-title">{bData.title}</div>
							</div>
						);
					})}
				</div>
			</div>
		);

		let accountsBlock: JSX.Element | null = null;

		const isWalletSupported = domain.registeredWallets.find(t => t.wallet === this.props.wallet);
		const isWalletAvailable = domain.availableWallets.find(t => t.wallet === this.props.wallet);

		const wallet = domain.wallets.find(w => w.factory.wallet === this.props.wallet);
		let ready = !!wallet?.accounts.length;

		let buttonHandler: React.MouseEventHandler<HTMLButtonElement> | undefined;
		let buttonContent: JSX.Element = <>Coming</>;

		// loading

		if (wallet) {
			const accounts = wallet.accounts;
			if (!isWalletAvailable) {
				buttonHandler = () => wallet.redirectToInstall();
				buttonContent = <>Install</>;
			} else {
				if (wallet.currentWalletAccount || accounts.length) {
					if (wallet.currentWalletAccount && wallet.isAccountRegistered(wallet.currentWalletAccount)) {
						ready = true;
						buttonHandler = () => this.connectAccount();
						buttonContent = <>Add new account</>;
					} else {
						buttonHandler = () => this.connectAccount();
						buttonContent = (
							<>
								Add{' '}
								{wallet.currentWalletAccount
									? shrinkAddress(wallet.currentWalletAccount.address, 14)
									: 'new account'}
							</>
						);
					}
				} else {
					buttonHandler = () => this.connectAccount();
					buttonContent = <>Connect</>;
				}
			}
			if (accounts.length) {
				accountsBlock = (
					<div className="wb-body">
						<div className="wb-title">Connected accounts:</div>
						<div className="wb-accounts-list">
							{accounts.map(account => (
								<AccountBlock key={account.account.address} account={account} />
							))}
						</div>
					</div>
				);
			}
		}

		headRight = (
			<YlideButton onClick={buttonHandler}>{this.loading ? <Spin size="small" /> : buttonContent}</YlideButton>
		);

		const wrapperClass = cn('wallet-block', {
			'not-available': !isWalletSupported,
			'ready': ready,
		});

		// {loading ? (
		// 	<YlideButton>
		// 		<Spin />
		// 	</YlideButton>
		// ) : !isWalletAvailable ? (
		// 	<YlideButton onClick={() => installWallet(wallet)}>Install</YlideButton>
		// ) : !account ? (
		// 	<YlideButton onClick={() => connectAccount(wallet)}>Connect</YlideButton>
		// ) : !isKeysEqual ? (
		// 	<YlideButton onClick={() => instantiateKey(wallet)}>
		// 		{isSomeKeyPublished ? 'Sign in' : 'Sign up'}
		// 	</YlideButton>
		// ) : (
		// 	<div
		// 		style={{
		// 			padding: '12px 20px',
		// 			fontSize: 14,
		// 		}}
		// 	>
		// 		<b>Ready</b>
		// 	</div>
		// )}

		return (
			<div className={wrapperClass}>
				<div className="wb-head">
					<div className="wb-head-left">
						<div className="wb-logo">{wData.logo}</div>
						<div className="wb-title">{wData.title}</div>
					</div>
					<div className="wb-head-right">{headRight}</div>
				</div>
				{accountsBlock}
				{blockchainsBlock}
				{!isWalletSupported ? <div className="wb-not-available">Coming soon, stay tuned</div> : null}
			</div>
		);
	}
}
