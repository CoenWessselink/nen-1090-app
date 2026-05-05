from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.pagesizes import A4

def build_pdf(project, welders, wps):
    doc = SimpleDocTemplate("/tmp/ce.pdf", pagesize=A4)
    styles = getSampleStyleSheet()
    story = []

    story.append(Paragraph(f"CE DOSSIER - {project.name}", styles['Title']))
    story.append(Spacer(1, 20))

    story.append(Paragraph("PROJECT INFO", styles['Heading2']))
    story.append(Paragraph(project.name, styles['Normal']))
    story.append(Spacer(1, 10))

    if welders:
        story.append(Paragraph("LASSERS", styles['Heading2']))
        rows = [["Code", "Naam"]]
        for w in welders:
            rows.append([w.code, w.name])
        story.append(Table(rows))

    if wps:
        story.append(Paragraph("WPS", styles['Heading2']))
        rows = [["Code", "Type"]]
        for w in wps:
            rows.append([w.code, w.kind])
        story.append(Table(rows))

    doc.build(story)
