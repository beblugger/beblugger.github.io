---
# Feel free to add content and custom Front Matter to this file.
# To modify the layout, see https://jekyllrb.com/docs/themes/#overriding-theme-defaults

layout: default 
---


<style>
  .post-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; list-style: none; padding: 0; }
  .post-card { border: 1px solid #ddd; padding: 1rem; border-radius: 8px; }
  .post-card h3 { margin-top: 0; }
</style>

<h1>文章动态</h1>

<ul class="post-grid">
  {% for post in site.posts %}
    <li class="post-card">
      <h3><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h3>
      <p><small>{{ post.date | date: "%Y-%m-%d" }}</small></p>
      <p>{{ post.excerpt }}</p>
    </li>
  {% endfor %}
</ul>
