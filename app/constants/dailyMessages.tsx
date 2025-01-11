import React from 'react';

const Target = {
    T30: (text: string) => <span className="font-bold text-[#FF7043]">{text}</span>,
    T42: (text: string) => <span className="font-bold text-[#FFD54F]">{text}</span>,
    T50: (text: string) => <span className="font-bold text-[#81C784]">{text}</span>,
    T58: (text: string) => <span className="font-bold text-[#64B5F6]">{text}</span>,
    T65: (text: string) => <span className="font-bold text-[#BA68C8]">{text}</span>,
};

const createDailyMessage = (shadowingLink: string) => {
    // Extract topic name from the URL and clean it up
    const topicName = shadowingLink
        .split('/').pop()                    // Get the last part after /
        ?.replace(/%20/g, ' ')              // Replace %20 with space
        ?.replace(/\([^)]*\)/g, '')         // Remove content in parentheses
        ?.trim();                           // Remove extra spaces

    const baseMessage = (
        <div className="space-y-2">
            <p>Luyện đọc 5 lần Template Describe Image {Target.T30('Target 30')}, {Target.T42('Target 42')}, {Target.T50('Target 50')}, {Target.T58('Target 58')}, {Target.T65('Target 65')}</p>
            <p>Làm 1 bài Summarize Spoken Text gửi lên group Zalo {Target.T30('Target 30')}, {Target.T42('Target 42')}, {Target.T50('Target 50')}, {Target.T58('Target 58')}, {Target.T65('Target 65')}</p>
            <p>Chép 10 câu Write From Dictation gửi lên group Zalo, kết hợp nghe thụ động {Target.T30('Target 30')}, {Target.T42('Target 42')}, {Target.T50('Target 50')}, {Target.T58('Target 58')}, {Target.T65('Target 65')}</p>
            <p>Ôn 10 câu Fill In The Blanks, 	R&W: Fill in the blanks {Target.T50('Target 50')}, {Target.T58('Target 58')}, {Target.T65('Target 65')}</p>
            <p>Luyện đọc 20 câu Read Aloud {Target.T50('Target 50')}, {Target.T58('Target 58')}, {Target.T65('Target 65')}</p>
            <p>Luyện đọc 20 câu Repeat Sentence {Target.T50('Target 50')}, {Target.T58('Target 58')}, {Target.T65('Target 65')}</p>
            <p>Luyện đọc Shadowing bài: sử dụng đường link này: {Target.T30('Target 30')} {Target.T42('Target 42')}</p>
            <p>
                <a 
                    href={shadowingLink} 
                    className="text-[#fc5d01] hover:text-[#fd7f33] underline" 
                    target="_blank" 
                    rel="noopener noreferrer"
                >
                    {topicName}
                </a>
            </p>
            <p>Sau đó bấm vào practice để qua APEUNI để ghi âm và gửi lên group Zalo</p>
        </div>
    );

    return baseMessage;
};

export const DAILY_MESSAGES = {
    'Sunday': (shadowingLink: string) => createDailyMessage(shadowingLink),
    'Monday': (shadowingLink: string) => createDailyMessage(shadowingLink),
    'Tuesday': (shadowingLink: string) => createDailyMessage(shadowingLink),
    'Wednesday': (shadowingLink: string) => createDailyMessage(shadowingLink),
    'Thursday': (shadowingLink: string) => createDailyMessage(shadowingLink),
    'Friday': (shadowingLink: string) => createDailyMessage(shadowingLink),
    'Saturday': (shadowingLink: string) => createDailyMessage(shadowingLink)
};
