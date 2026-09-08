# -*- coding: utf-8 -*-
import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# 맑은 고딕 폰트 등록
FONT_REGULAR = "MalgunGothic"
FONT_BOLD = "MalgunGothicBold"
pdfmetrics.registerFont(TTFont(FONT_REGULAR, "C:/Windows/Fonts/malgun.ttf"))
pdfmetrics.registerFont(TTFont(FONT_BOLD, "C:/Windows/Fonts/malgunbd.ttf"))

class NumberedCanvas(canvas.Canvas):
    """2페이지 분량의 총 페이지 수와 풋터를 동적으로 표기하는 Canvas"""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont(FONT_REGULAR, 8.5)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # 헤더 라인 (2페이지부터 표시)
        if self._pageNumber > 1:
            self.drawString(16 * mm, 287 * mm, "cal.dudu 일정 조율 서비스 개발 미니프로젝트 수행일지")
            self.drawRightString(194 * mm, 287 * mm, "Day 2: UX 고도화 & 디자인 시스템 구축")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(16 * mm, 284 * mm, 194 * mm, 284 * mm)
            
        # 풋터
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(16 * mm, 14 * mm, 194 * mm, 14 * mm)
        
        self.drawString(16 * mm, 10 * mm, "cal.dudu 미니프로젝트 수행일지 | React · Vite · TypeScript · Supabase · Vercel")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(194 * mm, 10 * mm, page_str)
        self.restoreState()


def build_pdf(filename="미니프로젝트_수행일지.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        leftMargin=15 * mm,
        rightMargin=15 * mm,
        topMargin=15 * mm,
        bottomMargin=18 * mm
    )

    styles = getSampleStyleSheet()
    
    # 커스텀 스타일 정의
    title_style = ParagraphStyle(
        'DocTitle',
        fontName=FONT_BOLD,
        fontSize=21,
        leading=26,
        textColor=colors.HexColor("#1A1A1C")
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        fontName=FONT_REGULAR,
        fontSize=10.5,
        leading=15,
        textColor=colors.HexColor("#64748B")
    )
    
    sec_title_style = ParagraphStyle(
        'SecTitle',
        fontName=FONT_BOLD,
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#1A1A1C")
    )
    
    sub_sec_title_style = ParagraphStyle(
        'SubSecTitle',
        fontName=FONT_BOLD,
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#0F172A")
    )
    
    body_style = ParagraphStyle(
        'Body',
        fontName=FONT_REGULAR,
        fontSize=8.8,
        leading=12.5,
        textColor=colors.HexColor("#334155")
    )
    
    body_bold = ParagraphStyle(
        'BodyBold',
        fontName=FONT_BOLD,
        fontSize=8.8,
        leading=12.5,
        textColor=colors.HexColor("#0F172A")
    )

    tag_time_style = ParagraphStyle(
        'TagTime',
        fontName=FONT_BOLD,
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#FF5E10")
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        fontName=FONT_BOLD,
        fontSize=8.5,
        leading=11.5,
        textColor=colors.HexColor("#0F172A")
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        fontName=FONT_REGULAR,
        fontSize=8.2,
        leading=11.5,
        textColor=colors.HexColor("#334155")
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        fontName=FONT_BOLD,
        fontSize=8.2,
        leading=11.5,
        textColor=colors.HexColor("#0F172A")
    )

    story = []

    # ==================== [1페이지] ====================

    # 문서 헤더 (타이틀 + 메타 정보 표)
    header_data = [
        [
            Paragraph("<b>미니프로젝트 수행일지<font color='#FF5E10'>.</font></b>", title_style),
            Paragraph(
                "<b>프로젝트 기간</b> : 2026.09.07 ~ 09.08 (2일간)<br/>"
                "<b>기술 스택</b> : React, TS, Supabase, Vercel<br/>"
                "<b>핵심 도메인</b> : 1:1 일정 조율·예약 관리 서비스",
                table_cell_style
            )
        ],
        [
            Paragraph("일정 조율·예약 관리 서비스 (cal.dudu) 개발 및 UX 고도화", subtitle_style),
            ""
        ]
    ]
    header_table = Table(header_data, colWidths=[110 * mm, 70 * mm])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('SPAN', (1,0), (1,1)),
        ('BACKGROUND', (1,0), (1,1), colors.HexColor("#F8FAFC")),
        ('BOX', (1,0), (1,1), 0.8, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (1,0), (1,1), 6),
        ('BOTTOMPADDING', (1,0), (1,1), 6),
        ('LEFTPADDING', (1,0), (1,1), 8),
        ('RIGHTPADDING', (1,0), (1,1), 8),
        ('LEFTPADDING', (0,0), (0,-1), 0),
        ('RIGHTPADDING', (0,0), (0,-1), 0),
        ('BOTTOMPADDING', (0,1), (0,1), 2),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 3 * mm))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#1A1A1C"), spaceAfter=10))

    # 1. 프로젝트 개요 & 업무 불변 규칙
    def make_section_header(title_text, badge_text):
        data = [[
            Paragraph(f"<b>{title_text}</b>", sec_title_style),
            Paragraph(f"<font color='white'><b>{badge_text}</b></font>", ParagraphStyle('Badge', fontName=FONT_BOLD, fontSize=8, textColor=colors.white, alignment=2))
        ]]
        t = Table(data, colWidths=[150 * mm, 30 * mm])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#FFF5EF")),
            ('LINELEFT', (0,0), (0,0), 3.5, colors.HexColor("#FF5E10")),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING', (0,0), (-1,-1), 3.5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
            ('LEFTPADDING', (0,0), (0,0), 8),
            ('RIGHTPADDING', (-1,-1), (-1,-1), 8),
            ('BACKGROUND', (1,0), (1,0), colors.HexColor("#1A1A1C")),
        ]))
        return t

    story.append(make_section_header("1. 프로젝트 개요 및 제약 조건", "OVERVIEW"))
    story.append(Spacer(1, 2 * mm))

    overview_box = [
        [Paragraph(
            "• <b>목적 :</b> 개인별 구현 편차를 통제하고, 정밀한 프롬프트 지시 및 업무 규칙에 따라 14일 42슬롯(1:1 미팅) 예약·승인 웹 서비스를 완성.<br/>"
            "• <b>핵심 불변 규칙 :</b> ① 2026-09-09~22(14일 42슬롯), ② 1~3순위 희망 선택, ③ 신청 시 <b>비점유 대기(경합 가능)</b>, ④ 어드민 <b>수동 확정</b>, ⑤ 전 후보 소진 시 재선택.<br/>"
            "• <b>개발 방식 :</b> 교육생 주도 스크럼(시간별 현황/장애 점검) & AI Agent(Claude/Antigravity) 페어 프로그래밍 협업.",
            body_style
        )]
    ]
    overview_table = Table(overview_box, colWidths=[180 * mm])
    overview_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 0.8, colors.HexColor("#CBD5E1")),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(overview_table)
    story.append(Spacer(1, 4 * mm))

    # 2. Day 1 (9/7) 수행 내용 및 트러블슈팅
    story.append(make_section_header("2. Day 1 (9/7) 수행일지: 세팅 및 플로우 구축", "DAY 1"))
    story.append(Spacer(1, 2 * mm))

    # 오전 트러블슈팅 표
    story.append(Paragraph("<b>[오전] 프로젝트 셋업 및 Supabase 연동 심층 해결</b>", sub_sec_title_style))
    story.append(Spacer(1, 1.5 * mm))

    d1_am_data = [
        [
            Paragraph("<b>시간</b>", table_header_style),
            Paragraph("<b>진행 상황 및 핵심 활동</b>", table_header_style),
            Paragraph("<b>장애 요소 및 해결 결과 (Trouble Shooting)</b>", table_header_style)
        ],
        [
            Paragraph("<b>10:35<br/>~ 10:48</b>", tag_time_style),
            Paragraph("• GitHub 저장소 연동 및 기초 Vite/React/TS 환경 세팅<br/>• Agent 대상 프로젝트 전수조사 및 아키텍처 정리 지시<br/>• 기본 사이트 렌더링 확인 (사용자/어드민 URL 분리)", table_cell_style),
            Paragraph("• <b>이슈 :</b> 기본 UI 버튼 글자 색상 미표출 결함 발견<br/>• <b>조치 :</b> CSS 버튼 텍스트 대비 긴급 수정 완료 (장애 없음)", table_cell_style)
        ],
        [
            Paragraph("<b>11:28<br/>~ 12:00</b>", tag_time_style),
            Paragraph("• Supabase 클라우드 데이터베이스 연동 작업 진행<br/>• 관리자 콘솔 및 사용자 신청 폼 분리 검증", table_cell_style),
            Paragraph(
                "• <b>장애 :</b> 콘솔 에러는 없으나 Supabase 서버에 실제 요청이 미전송되고 Admin 목록이 비어있는 현상 발생.<br/>"
                "• <b>원인 :</b> Agent가 로컬 데모 모드와 Supabase 모드를 혼용 설계함.<br/>"
                "• <b>해결 :</b> 모드별 역할(Local vs Supabase RPC)을 엄격히 분리하도록 재지시. Admin의 로컬 함수 호출 오류 동기화 수정하여 연동 성공.",
                table_cell_style
            )
        ]
    ]
    d1_am_table = Table(d1_am_data, colWidths=[20 * mm, 75 * mm, 85 * mm])
    d1_am_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#F1F5F9")),
        ('GRID', (0,0), (-1,-1), 0.6, colors.HexColor("#CBD5E1")),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(d1_am_table)
    story.append(Spacer(1, 3 * mm))

    # 오후 UJM / 블루프린트 표
    story.append(Paragraph("<b>[오후] UJM/블루프린트 기획 & MUST HAVE 기능 도출 및 Vercel 배포</b>", sub_sec_title_style))
    story.append(Spacer(1, 1.5 * mm))

    d1_pm_data = [
        [
            Paragraph("<b>시간</b>", table_header_style),
            Paragraph("<b>진행 상황 및 수행 내역</b>", table_header_style),
            Paragraph("<b>주요 성과 및 개선점</b>", table_header_style)
        ],
        [
            Paragraph("<b>13:10<br/>~ 13:49</b>", tag_time_style),
            Paragraph("• 로그인 시 변경사항 실시간 알림 토스트 구현<br/>• B2B 에이전시 대표 '김민준' 페르소나 설계<br/>• As-Is 서비스 블루프린트 시각화(HTML)", table_cell_style),
            Paragraph("• 사용자 여정(5단계: 탐색-신청-대기-확정-미팅) 정립<br/>• 메인 화면 우측 하단 기획 문서 바로가기 연동 완료", table_cell_style)
        ],
        [
            Paragraph("<b>15:15<br/>~ 16:49</b>", tag_time_style),
            Paragraph(
                "• <b>감정 최저점 발견 :</b> Step 3(예약 대기)에서 경쟁 탈락/마감 시 극심한 부정 감정 발생 확인.<br/>"
                "• To-Be 서비스 블루프린트 수립 및 <b>MUST HAVE 2대 기능 구현 :</b><br/>"
                "  1) <b>스마트 대체 슬롯 원클릭 추천 :</b> 경합 탈락 시 빈자리 자동 계산 추천<br/>"
                "  2) <b>슬롯 3개 꽉 채워 신청 유도 :</b> 승인 확률을 높여 반복 재접속 방지",
                table_cell_style
            ),
            Paragraph(
                "• 비점유 대기 중복 확인 및 재신청 알고리즘 완성<br/>"
                "• 일반 사용자 눈높이에 맞춘 친화적 에러 메시지 개선<br/>"
                "• <b>Vercel 프로덕션 자동 배포 완료</b>",
                table_cell_style
            )
        ]
    ]
    d1_pm_table = Table(d1_pm_data, colWidths=[20 * mm, 90 * mm, 70 * mm])
    d1_pm_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#F1F5F9")),
        ('GRID', (0,0), (-1,-1), 0.6, colors.HexColor("#CBD5E1")),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(d1_pm_table)

    # ==================== [2페이지] ====================
    story.append(PageBreak())

    # 3. Day 2 (9/8) 대기확인 경험 고도화 & 톤앤매너 정립
    story.append(make_section_header("3. Day 2 (9/8) 수행일지: 대기확인 UX & 디자인 고도화", "DAY 2"))
    story.append(Spacer(1, 2 * mm))

    # 벤치마킹 테이블
    story.append(Paragraph("<b>[목표 정립] 4대 서비스 벤치마킹 기반 '대기확인 단계' 완벽 혁신</b>", sub_sec_title_style))
    story.append(Spacer(1, 1.5 * mm))

    bench_data = [
        [
            Paragraph("<b>벤치마크 서비스</b>", table_header_style),
            Paragraph("<b>핵심 차용 기능</b>", table_header_style),
            Paragraph("<b>프로젝트(cal.dudu) 적용 방식</b>", table_header_style)
        ],
        [
            Paragraph("<b>네이버 예약</b>", table_cell_bold),
            Paragraph("고객 예약 관리 기능 (진행 상황 명확 표출)", table_cell_style),
            Paragraph("신청 접수 &rarr; 관리자 검토 &rarr; 확정의 실시간 3단계 상태 시각화", table_cell_style)
        ],
        [
            Paragraph("<b>Google Calendar</b>", table_cell_bold),
            Paragraph("예약 가능 시간 설정 (인근 날짜 기준 표출)", table_cell_style),
            Paragraph("오늘 날짜 기준 1주차/2주차 수평 스크롤 인근 주간 그리드 배치", table_cell_style)
        ],
        [
            Paragraph("<b>SuperSaaS</b>", table_cell_bold),
            Paragraph("달력 형태의 직관적 정보 표출 화면", table_cell_style),
            Paragraph("14행 긴 테이블 대신 일자별 슬롯 카드 그리드로 전면 개편", table_cell_style)
        ],
        [
            Paragraph("<b>Calendly</b>", table_cell_bold),
            Paragraph("한 화면에 필요한 정보만 압축 표출", table_cell_style),
            Paragraph("불필요 미사여구 배제, 좌측 신청패널 + 우측 달력의 2분할 뷰 완성", table_cell_style)
        ]
    ]
    bench_table = Table(bench_data, colWidths=[36 * mm, 64 * mm, 80 * mm])
    bench_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#FFF5EF")),
        ('GRID', (0,0), (-1,-1), 0.6, colors.HexColor("#CBD5E1")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(bench_table)
    story.append(Spacer(1, 3 * mm))

    # 오후 타임슬롯 스프린트 표
    story.append(Paragraph("<b>[오후 스프린트] 기능 압축, 마이크로 연출 및 60-30-10 디자인 정돈</b>", sub_sec_title_style))
    story.append(Spacer(1, 1.5 * mm))

    d2_pm_data = [
        [
            Paragraph("<b>스프린트</b>", table_header_style),
            Paragraph("<b>시간대</b>", table_header_style),
            Paragraph("<b>수행 내용 및 산출물</b>", table_header_style),
            Paragraph("<b>핵심 개선 성과</b>", table_header_style)
        ],
        [
            Paragraph("<b>제작 1</b>", table_cell_bold),
            Paragraph("<b>13:10<br/>~ 13:52</b>", tag_time_style),
            Paragraph("• Google Calendar 스타일 주간 캘린더 전면 전환<br/>• 진행 상황 탭 신설 및 실시간 상태 동기화", table_cell_style),
            Paragraph("오늘 날짜 기준 인근 주간 그리드로 시인성 대폭 향상", table_cell_style)
        ],
        [
            Paragraph("<b>제작 2</b>", table_cell_bold),
            Paragraph("<b>13:52<br/>~ 14:51</b>", tag_time_style),
            Paragraph("• 불필요한 미사여구/홍보문구 전면 제거<br/>• 슬라이드인 애니메이션 및 Web Audio 클릭음 탑재", table_cell_style),
            Paragraph("목적 집중형 미니멀 UI 및 즉각적 상호작용 피드백 제공", table_cell_style)
        ],
        [
            Paragraph("<b>제작 3<br/>& 정돈</b>", table_cell_bold),
            Paragraph("<b>14:51<br/>~ 16:30</b>", tag_time_style),
            Paragraph(
                "• <b>1차 :</b> GDWEB 어워드 수상작 '소이정' 톤앤매너(블랙/오렌지) 채택.<br/>"
                "• <b>2차 :</b> 주황색과 녹색이 섞여 발생한 시각적 부조화 발견 &rarr; <b>60-30-10 색상 설계 규칙</b>에 입각하여 전면 재정돈.<br/>"
                "  - 산만하던 42개 슬롯의 형광 녹색 전면 제거 &rarr; 차분한 슬레이트 그레이 수렴<br/>"
                "  - 단일 오렌지 Accent(#FF5E10)와 매트 차콜(#1A1A1C) 하이 콘트라스트 확립",
                table_cell_style
            ),
            Paragraph(
                "시각적 노이즈 완전 제거 및 세련된 에이전시 룩 확립<br/>"
                "(단위 테스트 19/19 통과 유지)",
                table_cell_style
            )
        ]
    ]
    d2_pm_table = Table(d2_pm_data, colWidths=[18 * mm, 18 * mm, 94 * mm, 50 * mm])
    d2_pm_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#F1F5F9")),
        ('GRID', (0,0), (-1,-1), 0.6, colors.HexColor("#CBD5E1")),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(d2_pm_table)
    story.append(Spacer(1, 3.5 * mm))

    # 4. 종합 성과 및 총평
    story.append(make_section_header("4. 미니프로젝트 최종 성과 및 교훈", "SUMMARY"))
    story.append(Spacer(1, 1.5 * mm))

    summary_data = [
        [
            Paragraph("<b>구분</b>", table_header_style),
            Paragraph("<b>As-Is (초기 상태)</b>", table_header_style),
            Paragraph("<b>To-Be (최종 완성 상태)</b>", table_header_style)
        ],
        [
            Paragraph("<b>정보 표출 방식</b>", table_cell_bold),
            Paragraph("14행 텍스트 나열형 단순 표 (가독성 저하)", table_cell_style),
            Paragraph("<b>인근 날짜 기준의 주간 캘린더 그리드</b> (Google Calendar 벤치마크)", table_cell_style)
        ],
        [
            Paragraph("<b>진행 상황 추적</b>", table_cell_bold),
            Paragraph("신청 후 관리자 처리 상태 파악 불가", table_cell_style),
            Paragraph("<b>접수 &rarr; 검토 &rarr; 확정 실시간 3단계 추적 탭</b> (네이버 예약 벤치마크)", table_cell_style)
        ],
        [
            Paragraph("<b>경합 마감 대처</b>", table_cell_bold),
            Paragraph("마감 시 수동으로 다시 날짜 탐색", table_cell_style),
            Paragraph("<b>스마트 대체 슬롯 원클릭 자동 추천 알고리즘 탑재</b>", table_cell_style)
        ],
        [
            Paragraph("<b>UI 및 색상 체계</b>", table_cell_bold),
            Paragraph("기본 부트스트랩풍 조잡한 다색 조합", table_cell_style),
            Paragraph("<b>소이정 블랙/오렌지 톤앤매너 & 60-30-10 단일 악센트 규칙 확립</b>", table_cell_style)
        ],
        [
            Paragraph("<b>품질 및 배포</b>", table_cell_bold),
            Paragraph("로컬 프로토타입", table_cell_style),
            Paragraph("<b>19/19 Vitest 테스트 100% 통과, Supabase RPC 연동, Vercel 자동 배포</b>", table_cell_style)
        ]
    ]
    summary_table = Table(summary_data, colWidths=[28 * mm, 66 * mm, 86 * mm])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#F8FAFC")),
        ('GRID', (0,0), (-1,-1), 0.6, colors.HexColor("#CBD5E1")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 2 * mm))

    closing_box = [
        [Paragraph(
            "<b>💡 프로젝트 총평 및 교훈 :</b><br/>"
            "단순한 기능 구현에 그치지 않고, <b>User Journey Map과 서비스 블루프린트</b>를 통해 고객 감정이 최저로 떨어지는 구간(대기 및 마감 탈락)을 데이터 기반으로 특정하고 실질적인 해결책(원클릭 추천, 3슬롯 유도)을 도출한 점이 가장 큰 결실이었습니다. "
            "또한 AI 에이전트 페어 프로그래밍 시 모드별(로컬 vs Supabase) 책임의 엄격한 분리와, 60-30-10 색상 원칙을 통한 시각적 노이즈 제어의 중요성을 실전적으로 체득하였습니다.",
            body_style
        )]
    ]
    closing_table = Table(closing_box, colWidths=[180 * mm])
    closing_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 0.8, colors.HexColor("#1A1A1C")),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(closing_table)

    # 빌드 실행
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated {filename}")

if __name__ == '__main__':
    # 1) 영문 파일명 (웹/시스템 안전용)
    build_pdf("mini_project_daily_log.pdf")
    # 2) 한글 파일명 복사본
    import shutil
    shutil.copyfile("mini_project_daily_log.pdf", "미니프로젝트_수행일지.pdf")
    print("Files created: mini_project_daily_log.pdf, 미니프로젝트_수행일지.pdf")
