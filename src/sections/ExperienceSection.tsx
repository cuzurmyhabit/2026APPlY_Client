import { useState } from 'react';
import { motion } from 'motion/react';
import styled from 'styled-components';

type Experience = {
  id: number;
  title: string;
  description: string;
  highlight: string;
  image: string;
};

const EXPERIENCES: Experience[] = [
  {
    id: 1,
    title: 'Maker Faire',
    description: '동아리원들이 직접 만든 프로젝트를 전시하는 메이커 행사에 참여했습니다.',
    highlight: 'Maker Faire',
    image: 'https://picsum.photos/960/540?random=11',
  },
  {
    id: 2,
    title: '청소년 SW 동행 project',
    description: '한국과학창의재단에서 지원하는 SW·AI 사업에 매년 참여합니다.',
    highlight: '청소년 SW 동행 project',
    image: 'https://picsum.photos/960/540?random=12',
  },
  {
    id: 3,
    title: 'SK Hynix Heinstein',
    description: 'SK 하이닉스에서 주최하는 대회에서 우수한 성과를 거뒀습니다.',
    highlight: 'SK Hynix Heinstein',
    image: 'https://picsum.photos/960/540?random=13',
  },
  {
    id: 4,
    title: 'Global Internship',
    description: '많은 대외활동과 경험으로 매년 과반수 이상의 동아리원이 글로벌 인턴십에 참여하고 있습니다.',
    highlight: 'Global Internship',
    image: 'https://picsum.photos/960/540?random=14',
  },
  {
    id: 5,
    title: 'IT SHOW',
    description: '미림의 자랑, 졸업 전시 IT SHOW에 2학년 때 프로젝트를 출품합니다.',
    highlight: 'IT SHOW',
    image: 'https://picsum.photos/960/540?random=15',
  },
  {
    id: 6,
    title: '전공 스터디',
    description: '매주 수요일 프로젝트 활동 및 선배와 스터디를 진행하며 전공 능력을 향상시킵니다.',
    highlight: '전공 스터디',
    image: 'https://picsum.photos/960/540?random=16',
  },
];

const Wrapper = styled.section`
  background: #fffbfd;
  padding: 6rem 3rem 4rem;
  display: flex;
  justify-content: center;
`;

const Inner = styled.div`
  max-width: 1200px;
  width: 100%;
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  column-gap: 64px;
  align-items: center;
`;

const LeftColumn = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 40px;
`;

const LeftImageWrap = styled.div`
  width: 100%;
  overflow: hidden;
`;

const ExperienceImage = styled(motion.img)`
  width: 100%;
  height: auto;
  display: block;
  object-fit: cover;
`;

const TitleBlock = styled.div`
  color: #000;
  font-family: 'Pretendard', sans-serif;
`;

const TitleTop = styled.div`
  font-size: 56px;
  font-weight: 700;
  line-height: 1.18;
`;

const TitleBottom = styled(motion.div)`
  margin-top: 4px;
  font-size: 56px;
  font-weight: 700;
  line-height: 1.18;
`;

const RightList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 30px;
  font-family: 'Pretendard', sans-serif;
`;

const RightItem = styled.li<{ $active: boolean }>`
  cursor: pointer;
  color: ${(p) => (p.$active ? '#000' : '#b8b8b8')};
`;

const RightTitle = styled.div<{ $active: boolean }>`
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 4px;
  color: inherit;
  opacity: ${(p) => (p.$active ? 1 : 0.7)};
`;

const RightDesc = styled.div`
  font-size: 12px;
  font-weight: 400;
  line-height: 1.6;
`;

const highlightVariants = {
  up: { y: -28, opacity: 0 },
  center: { y: 0, opacity: 1 },
  down: { y: 28, opacity: 0 },
} as const;

type Direction = keyof typeof highlightVariants;

export function ExperienceSection() {
  const [activeIndex, setActiveIndex] = useState(2); // 0-based, 처음 3번 선택
  const [prevIndex, setPrevIndex] = useState(2);

  const active = EXPERIENCES[activeIndex];
  const direction: Direction =
    activeIndex > prevIndex ? 'up' : activeIndex < prevIndex ? 'down' : 'up';

  return (
    <Wrapper>
      <Inner>
        <LeftColumn>
          <TitleBlock>
            <TitleTop>We Experience</TitleTop>
            <TitleBottom
              key={active.highlight}
              initial={direction === 'up' ? 'down' : 'up'}
              animate="center"
              variants={highlightVariants}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              {active.highlight}
            </TitleBottom>
          </TitleBlock>
          <LeftImageWrap>
            <ExperienceImage
              key={active.id}
              src={active.image}
              alt={active.highlight}
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            />
          </LeftImageWrap>
        </LeftColumn>

        <RightList>
          {EXPERIENCES.map((exp, idx) => (
            <RightItem
              key={exp.id}
              $active={idx === activeIndex}
              onMouseEnter={() => {
                setPrevIndex(activeIndex);
                setActiveIndex(idx);
              }}
            >
              <RightTitle $active={idx === activeIndex}>{exp.title}</RightTitle>
              <RightDesc>{exp.description}</RightDesc>
            </RightItem>
          ))}
        </RightList>
      </Inner>
    </Wrapper>
  );
}

