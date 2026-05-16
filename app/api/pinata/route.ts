import { NextResponse } from "next/server";

type PinataUpload = {
  cid: string;
  uri: string;
  gatewayUrl: string;
};

export async function POST(request: Request) {
  const jwt = process.env.PINATA_JWT;

  if (!jwt) {
    return NextResponse.json({ error: "PINATA_JWT is not configured." }, { status: 500 });
  }

  const incoming = await request.formData();
  const files = incoming
    .getAll("file")
    .concat(incoming.getAll("files"))
    .filter((item): item is File => item instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ error: "At least one image file is required." }, { status: 400 });
  }

  if (files.length > 3) {
    return NextResponse.json({ error: "Upload a maximum of 3 images per review." }, { status: 400 });
  }

  if (files.some((file) => !file.type.startsWith("image/"))) {
    return NextResponse.json({ error: "Only image uploads are supported." }, { status: 400 });
  }

  const gateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY || "https://jade-patient-viper-512.mypinata.cloud";
  const uploads: PinataUpload[] = [];

  for (const file of files) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("pinataMetadata", JSON.stringify({ name: `crankfoodie-${file.name}` }));
    formData.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

    const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`
      },
      body: formData
    });

    if (!response.ok) {
      const message = await response.text();
      return NextResponse.json({ error: message }, { status: response.status });
    }

    const result = await response.json();
    uploads.push({
      cid: result.IpfsHash,
      uri: `ipfs://${result.IpfsHash}`,
      gatewayUrl: `${gateway}/ipfs/${result.IpfsHash}`
    });
  }

  return NextResponse.json({
    uploads,
    cids: uploads.map((upload) => upload.cid),
    uris: uploads.map((upload) => upload.uri),
    gatewayUrls: uploads.map((upload) => upload.gatewayUrl),
    cid: uploads[0].cid,
    uri: uploads[0].uri,
    gatewayUrl: uploads[0].gatewayUrl
  });
}
