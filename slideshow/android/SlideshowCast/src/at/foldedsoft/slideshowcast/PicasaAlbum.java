package at.foldedsoft.slideshowcast;

import org.json.JSONObject;

public class PicasaAlbum {
  private String id;
  private String name;
  private int photos;
  private String url;
  private String image;
  
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
  
  public String getId() { return this.id; }
  public String getUrl() { return this.url; }
  public int getPhotos() { return this.photos; }
  public String getName() { return this.name; }
  public String getImage() { return this.image; }
}
