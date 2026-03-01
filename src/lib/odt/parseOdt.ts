import fs from 'fs/promises'
import JSZip from 'jszip'
import he from 'he'

/**
 * Parse an .odt file (content.xml) into a normalized plain text string.
 * Keeps spaces/tabs encoded by OpenDocument tags and collapses whitespace.
 */
export async function parseOdtToText(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath)
  const zip = await JSZip.loadAsync(buffer)

  const contentFile = zip.file('content.xml')
  if (!contentFile) {
    // Fallback: treat as plain text.
    return buffer.toString('utf-8').replace(/\s+/g, ' ').trim()
  }

  let xml = await contentFile.async('string')

  // Expand <text:s text:c="N"/> to N spaces.
  xml = xml.replace(/<text:s[^>]*text:c="(\d+)"[^>]*\/>/g, (_, n) => ' '.repeat(Number(n)))
  // Single space tag.
  xml = xml.replace(/<text:s(?:\s+[^>]*)?\/>/g, ' ')
  // Tabs.
  xml = xml.replace(/<text:tab(?:\s+[^>]*)?\/>/g, '\t')
  // Paragraphs/headings as spaces.
  xml = xml.replace(/<\/text:p>/g, ' ')
  xml = xml.replace(/<\/text:h>/g, ' ')
  // Strip remaining tags.
  xml = xml.replace(/<[^>]+>/g, '')
  // Decode XML entities.
  let text = he.decode(xml)
  // Normalize whitespace.
  text = text.replace(/\s+/g, ' ').trim()

  return text
}
