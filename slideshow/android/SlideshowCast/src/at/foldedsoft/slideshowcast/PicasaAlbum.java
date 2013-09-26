package at.foldedsoft.slideshowcast;

import org.json.JSONObject;

public class PicasaAlbum {
  public String id;
  public String name;
  public int photos;
  public String url;
  public String image;
  
  public PicasaAlbum(String id, String name, int photos, String url, String image) {
    this.id = id;
    this.url = url;
    this.image = image;
    this.name = name;
    this.photos = photos;
  }
  
  public PicasaAlbum(JSONObject entry) {
    this.id = entry.optJSONObject("gphoto$id").optString("$t");
    this.name = entry.optJSONObject("title").optString("$t");
    this.photos = entry.optJSONObject("gphoto$numphotos").optInt("$t", 0);
    this.url = entry.optJSONArray("link").optJSONObject(0).optString("href");
    this.image = entry.optJSONObject("media$group").optJSONArray("media$thumbnail").optJSONObject(0).optString("url");
  }
}
