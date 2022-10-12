import React from 'react';
import MainLayout from '../../layouts/MainLayout';
import { observer } from 'mobx-react';
import mailList from '../../stores/MailList';

const SettingsPage = observer(() => {
	return (
		<MainLayout>
			<div className="col-lg-9">
				<div className="ibox">
					<div className="ibox-content">
						<div style={{ display: 'flex', justifyContent: 'space-between' }}>
							<h2>Settings</h2>
						</div>

						<div style={{ marginTop: 30, display: 'flex', alignItems: 'center' }}>
							<span style={{ marginRight: 50 }}>Save decoded mails to internal storage</span>
							<input
								checked={!!mailList.saveDecodedMessages}
								onChange={() => mailList.setSaveDecodedSetting(!mailList.saveDecodedMessages)}
								type="checkbox"
							/>
						</div>
					</div>
				</div>
			</div>
		</MainLayout>
	);
});

export default SettingsPage;
