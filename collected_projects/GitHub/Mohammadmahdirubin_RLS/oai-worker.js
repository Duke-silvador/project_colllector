const SOURCE = "https://rlsj.ir/metadata/articles.json";
const BASE_URL = "https://oai.rlsj.ir/";
const NS = "http://www.openarchives.org/OAI/2.0/";
const DC = "http://www.openarchives.org/OAI/2.0/oai_dc/";
const DCE = "http://purl.org/dc/elements/1.1/";

const esc = v => String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");
const tag = (k,v) => v !== undefined && v !== null && String(v).trim() !== "" ? `<dc:${k}>${esc(v)}</dc:${k}>` : "";
const list = (obj,k) => ["fa","en","ru"].map(lang => obj && obj[lang] ? tag(k,obj[lang]) : "").join("");
const validDate = v => /^\d{4}-\d{2}-\d{2}$/.test(v || "") ? v : "2026-09-17";
const knownVerbs = ["Identify","ListMetadataFormats","ListSets","ListIdentifiers","ListRecords","GetRecord"];

function record(a) {
  const identifier = "oai:rlsj.ir:" + a.id;
  const fields =
    list(a.title,"title") +
    ["fa","en","ru"].map(k => a.authors && a.authors[k] ? tag("creator",a.authors[k]) : "").join("") +
    tag("publisher","Russian Language Studies") +
    tag("date",validDate(a.publicationDate)) +
    tag("type","Text") + tag("type","Article") + tag("type","info:eu-repo/semantics/article") +
    tag("rights","info:eu-repo/semantics/openAccess") + tag("format","application/pdf") +
    tag("identifier",a.landingPage) + tag("identifier",a.pdf) +
    tag("identifier",a.doi) + tag("language",a.language) +
    list(a.keywords,"subject") + list(a.abstract,"description");

  return `<record><header><identifier>${esc(identifier)}</identifier><datestamp>${validDate(a.publicationDate)}</datestamp><setSpec>rls</setSpec><setSpec>openaire</setSpec></header><metadata><oai_dc:dc xmlns:oai_dc="${DC}" xmlns:dc="${DCE}">${fields}</oai_dc:dc></metadata></record>`;
}

function envelope(url, body) {
  const attrs = [...url.searchParams.entries()]
    .map(([k,v]) => ` ${esc(k)}="${esc(v)}"`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><OAI-PMH xmlns="${NS}"><responseDate>${new Date().toISOString().replace(/\.\d{3}Z$/,"Z")}</responseDate><request${attrs}>${BASE_URL}</request>${body}</OAI-PMH>`;
}

function errorResponse(url, code, message, status = 200, headers) {
  return new Response(envelope(url, `<error code="${esc(code)}">${esc(message)}</error>`), {status, headers});
}

export default {
  async fetch(req) {
    const url = new URL(req.url);
    // Ignore common analytics parameters that may be appended by link previews or browsers.
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "utm_id", "gclid", "fbclid"]) {
      url.searchParams.delete(key);
    }
    const verb = url.searchParams.get("verb") || "";
    const headers = {
      "content-type": "application/xml; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "Content-Type",
      "cache-control": "no-cache"
    };

    if (req.method === "OPTIONS") return new Response("", {status:204, headers});
    if (req.method !== "GET") return new Response("Method Not Allowed", {status:405, headers});
    if (!verb) return errorResponse(url, "badVerb", "The request verb is missing.", 200, headers);
    if (!knownVerbs.includes(verb)) return errorResponse(url, "badVerb", "Unsupported OAI-PMH verb.", 200, headers);

    const allowed = {
      Identify: ["verb"],
      ListMetadataFormats: ["verb","identifier"],
      ListSets: ["verb","resumptionToken"],
      ListIdentifiers: ["verb","metadataPrefix","from","until","set","resumptionToken"],
      ListRecords: ["verb","metadataPrefix","from","until","set","resumptionToken"],
      GetRecord: ["verb","identifier","metadataPrefix"]
    };
    for (const key of url.searchParams.keys()) {
      if (!allowed[verb].includes(key)) return errorResponse(url, "badArgument", `Unexpected argument: ${key}`, 200, headers);
    }

    if (["ListIdentifiers","ListRecords","GetRecord"].includes(verb) &&
        url.searchParams.has("resumptionToken")) {
      return errorResponse(url, "badResumptionToken", "Resumption tokens are not supported.", 200, headers);
    }

    if (["ListIdentifiers","ListRecords","GetRecord"].includes(verb) &&
        url.searchParams.get("metadataPrefix") !== "oai_dc") {
      return errorResponse(url, url.searchParams.has("metadataPrefix") ? "cannotDisseminateFormat" : "badArgument",
        url.searchParams.has("metadataPrefix") ? "Unsupported metadataPrefix." : "metadataPrefix is required.", 200, headers);
    }

    if (verb === "GetRecord" && !url.searchParams.get("identifier")) {
      return errorResponse(url, "badArgument", "identifier is required.", 200, headers);
    }

    if (["ListMetadataFormats","GetRecord"].includes(verb) && url.searchParams.has("identifier") &&
        !url.searchParams.get("identifier").startsWith("oai:rlsj.ir:")) {
      return errorResponse(url, "idDoesNotExist", "Record not found.", 200, headers);
    }

    let data;
    try {
      const response = await fetch(SOURCE, {headers: {"accept":"application/json"}});
      if (!response.ok) throw new Error("Metadata source unavailable");
      data = await response.json();
      if (!Array.isArray(data.articles)) throw new Error("Invalid metadata source");
    } catch {
      return errorResponse(url, "noRecordsMatch", "Metadata source unavailable.", 502, headers);
    }

    const articles = data.articles;
    let body = "";

    if (verb === "Identify") {
      const dates = articles.map(a => validDate(a.publicationDate)).sort();
      const earliest = dates.length ? dates[0] : "2026-09-17";
      body = `<Identify><repositoryName>Russian Language Studies</repositoryName><baseURL>${BASE_URL}</baseURL><protocolVersion>2.0</protocolVersion><adminEmail>mm.rubin@ut.ac.ir</adminEmail><earliestDatestamp>${earliest}</earliestDatestamp><deletedRecord>no</deletedRecord><granularity>YYYY-MM-DD</granularity></Identify>`;
    } else if (verb === "ListMetadataFormats") {
      const identifier = url.searchParams.get("identifier");
      const exists = !identifier || articles.some(a => "oai:rlsj.ir:" + a.id === identifier);
      if (!exists) return errorResponse(url, "idDoesNotExist", "Record not found.", 200, headers);
      body = '<ListMetadataFormats><metadataFormat><metadataPrefix>oai_dc</metadataPrefix><schema>http://www.openarchives.org/OAI/2.0/oai_dc.xsd</schema><metadataNamespace>http://www.openarchives.org/OAI/2.0/oai_dc/</metadataNamespace></metadataFormat></ListMetadataFormats>';
    } else if (verb === "ListSets") {
      body = '<ListSets><set><setSpec>rls</setSpec><setName>Russian Language Studies</setName></set><set><setSpec>openaire</setSpec><setName>OpenAIRE records</setName></set></ListSets>';
    } else if (verb === "ListRecords" || verb === "ListIdentifiers") {
      const from = url.searchParams.get("from");
      const until = url.searchParams.get("until");
      const set = url.searchParams.get("set");
      if (from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) return errorResponse(url, "badArgument", "from must use YYYY-MM-DD.", 200, headers);
      if (until && !/^\d{4}-\d{2}-\d{2}$/.test(until)) return errorResponse(url, "badArgument", "until must use YYYY-MM-DD.", 200, headers);
      if (from && until && from > until) return errorResponse(url, "badArgument", "from must not be later than until.", 200, headers);
      if (set && !["rls","openaire"].includes(set)) return errorResponse(url, "noRecordsMatch", "No records match the requested set.", 200, headers);

      const matches = articles.filter(a => {
        const d = validDate(a.publicationDate);
        return (!from || d >= from) && (!until || d <= until);
      });
      if (!matches.length) return errorResponse(url, "noRecordsMatch", "No records match the request.", 200, headers);

      if (verb === "ListRecords") {
        body = "<ListRecords>" + matches.map(record).join("") + "</ListRecords>";
      } else {
        body = "<ListIdentifiers>" + matches.map(a =>
          `<header><identifier>${esc("oai:rlsj.ir:" + a.id)}</identifier><datestamp>${validDate(a.publicationDate)}</datestamp><setSpec>rls</setSpec><setSpec>openaire</setSpec></header>`
        ).join("") + "</ListIdentifiers>";
      }
    } else if (verb === "GetRecord") {
      const identifier = url.searchParams.get("identifier");
      const article = articles.find(a => "oai:rlsj.ir:" + a.id === identifier);
      if (!article) return errorResponse(url, "idDoesNotExist", "Record not found.", 200, headers);
      body = "<GetRecord>" + record(article) + "</GetRecord>";
    }

    return new Response(envelope(url, body), {status:200, headers});
  }
};
