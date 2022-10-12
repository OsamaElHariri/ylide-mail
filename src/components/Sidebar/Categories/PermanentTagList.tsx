import React from 'react';
import PermanentTag from './PermanentTag';
import { observer } from 'mobx-react';
import mailList from '../../../stores/MailList';
import { useNavigate } from 'react-router-dom';

interface PermanentTagListProps {}

const PermanentTagList: React.FC<PermanentTagListProps> = observer(() => {
	const navigate = useNavigate();

	return (
		<ul className="folder-list m-b-md" style={{ padding: 0 }}>
			<PermanentTag
				active={mailList.activeFolderId === 'inbox'}
				text={'Inbox'}
				onClick={() => navigate('/inbox')}
			/>
			<PermanentTag active={mailList.activeFolderId === 'sent'} text={'Sent'} onClick={() => navigate('/sent')} />
			<PermanentTag
				active={mailList.activeFolderId === 'archive'}
				text={'Archive'}
				onClick={() => navigate('/archive')}
			/>
			{/* <PermanentTag active={false} text={"Archive"} onClick={() => viewFolder("Archive")} /> */}
		</ul>
	);
});

export default PermanentTagList;
