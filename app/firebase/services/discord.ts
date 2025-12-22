/**
 * Discord Webhook Service
 * Gửi notifications đến Discord channel cho các events quan trọng
 */

// Webhook URLs cho từng loại thông báo
const HOMEWORK_WEBHOOK_URL = process.env.NEXT_PUBLIC_HOMEWORK_WEBHOOK_URL || 
  'https://discord.com/api/webhooks/1452552521146175582/UGncmc0Zp-2ej8aoT2p3kY6ItP7DV3WQJMg_w4GLZNHyTib1eRPMOyCTIe4TEIRNgZ3J';

const MOCKTEST_WEBHOOK_URL = process.env.NEXT_PUBLIC_MOCKTEST_WEBHOOK_URL || 
  'https://discord.com/api/webhooks/1452552781495013527/qyHiuI_6bGf2-opOGtKoYwhdXjx6wE_Vp3S7DMwF2E1Rx6Le-iepmNn46ntHygcvgedb';

const FEEDBACK_WEBHOOK_URL = process.env.NEXT_PUBLIC_FEEDBACK_WEBHOOK_URL || 
  'https://discord.com/api/webhooks/1452552894912925828/Sm3BJemKuQ0cAuaP0KeEcwkm4pmStbdYLP0EDoFAq2s0cdSX3d8RUdLgBSlV_xhSh8d2';

const ORANGE_COLOR = 0xfc5d01; // Màu cam của hệ thống

/**
 * Gửi notification khi học viên nộp bài tập
 */
export async function sendHomeworkNotification(
  studentName: string,
  homeworkType: string,
  date: string,
  links: string[],
  count: number
): Promise<boolean> {
  try {
    // Keep full text with links (no extraction, just filter empty ones)
    const validLinks = links
      .map(link => link.trim())
      .filter(link => link !== '');

    // Format links for Discord (max 10 links to avoid message being too long)
    const displayLinks = validLinks.slice(0, 10);
    const hasMore = validLinks.length > 10;
    
    const linksText = displayLinks
      .map((link, index) => `${index + 1}. ${link}`)
      .join('\n');
    
    const moreText = hasMore ? `\n... và ${validLinks.length - 10} links khác` : '';

    const embed = {
      title: '🎓 BÀI TẬP MỚI',
      color: ORANGE_COLOR,
      fields: [
        {
          name: '👤 Học viên',
          value: studentName,
          inline: true
        },
        {
          name: '📚 Loại bài tập',
          value: homeworkType,
          inline: true
        },
        {
          name: '📅 Ngày nộp',
          value: date,
          inline: true
        },
        {
          name: '📊 Số bài nộp',
          value: `${count} bài`,
          inline: true
        }
      ],
      description: validLinks.length > 0 
        ? `**📎 Links đã nộp:**\n${linksText}${moreText}`
        : 'Không có link',
      timestamp: new Date().toISOString(),
      footer: {
        text: 'MyLearning PTE System'
      }
    };

    const response = await fetch(HOMEWORK_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embeds: [embed]
      })
    });

    if (!response.ok) {
      console.error('Discord webhook failed:', response.status, response.statusText);
      return false;
    }

    console.log('Discord notification sent successfully: Homework submission');
    return true;
  } catch (error) {
    console.error('Error sending Discord notification:', error);
    return false;
  }
}

/**
 * Gửi notification khi giáo viên feedback bài tập
 */
export async function sendHomeworkFeedbackNotification(
  teacherName: string,
  studentName: string,
  homeworkType: string,
  date: string,
  questionNumber: number
): Promise<boolean> {
  try {
    const embed = {
      title: '✏️ FEEDBACK BÀI TẬP',
      color: ORANGE_COLOR,
      fields: [
        {
          name: '👨‍🏫 Giáo viên',
          value: teacherName,
          inline: true
        },
        {
          name: '👤 Học viên',
          value: studentName,
          inline: true
        },
        {
          name: '📚 Loại bài tập',
          value: homeworkType,
          inline: true
        },
        {
          name: '🔢 Câu số',
          value: `#${questionNumber}`,
          inline: true
        },
        {
          name: '📅 Ngày bài tập',
          value: date,
          inline: true
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'MyLearning PTE System'
      }
    };

    const response = await fetch(FEEDBACK_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embeds: [embed]
      })
    });

    if (!response.ok) {
      console.error('Discord webhook failed:', response.status, response.statusText);
      return false;
    }

    console.log('Discord notification sent successfully: Homework feedback');
    return true;
  } catch (error) {
    console.error('Error sending Discord notification:', error);
    return false;
  }
}

/**
 * Gửi notification khi học viên nộp mocktest
 */
export async function sendMocktestNotification(
  studentName: string,
  className: string,
  date: string,
  link: string
): Promise<boolean> {
  try {
    // Extract URL if it's in APEUni format
    const extractedUrl = link.match(/https?:\/\/(?:www\.)?apeuni\.com\/[^\s]+/)?.[0] || link;

    const embed = {
      title: '📝 MOCKTEST MỚI',
      color: ORANGE_COLOR,
      fields: [
        {
          name: '👤 Học viên',
          value: studentName,
          inline: true
        },
        {
          name: '🏫 Lớp học',
          value: className,
          inline: true
        },
        {
          name: '📅 Ngày nộp',
          value: date,
          inline: true
        }
      ],
      description: `**📎 Link mocktest:**\n${extractedUrl}`,
      timestamp: new Date().toISOString(),
      footer: {
        text: 'MyLearning PTE System'
      }
    };

    const response = await fetch(MOCKTEST_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embeds: [embed]
      })
    });

    if (!response.ok) {
      console.error('Discord webhook failed:', response.status, response.statusText);
      return false;
    }

    console.log('Discord notification sent successfully: Mocktest submission');
    return true;
  } catch (error) {
    console.error('Error sending Discord notification:', error);
    return false;
  }
}

/**
 * Gửi notification khi giáo viên feedback mocktest
 */
export async function sendMocktestFeedbackNotification(
  teacherName: string,
  studentName: string,
  className: string
): Promise<boolean> {
  try {
    const embed = {
      title: '💬 FEEDBACK MOCKTEST',
      color: ORANGE_COLOR,
      fields: [
        {
          name: '👨‍🏫 Giáo viên',
          value: teacherName,
          inline: true
        },
        {
          name: '👤 Học viên',
          value: studentName,
          inline: true
        },
        {
          name: '🏫 Lớp học',
          value: className,
          inline: true
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'MyLearning PTE System'
      }
    };

    const response = await fetch(FEEDBACK_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embeds: [embed]
      })
    });

    if (!response.ok) {
      console.error('Discord webhook failed:', response.status, response.statusText);
      return false;
    }

    console.log('Discord notification sent successfully: Mocktest feedback');
    return true;
  } catch (error) {
    console.error('Error sending Discord notification:', error);
    return false;
  }
}
